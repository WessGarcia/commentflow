import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { replyToComment, sendPrivateReply, type IgCredentials } from "@/lib/meta";
import { getActiveCredentials } from "@/lib/credentials";
import { asDmFlow, buildStepMessage } from "@/lib/flowTypes";
import { estaBloqueado, registrarEnvio, registrarMensagem } from "@/lib/conversas";
import { notificar } from "@/lib/notificacoes";

export interface IncomingComment {
  commentId: string;
  mediaId?: string;
  fromUserId?: string;
  fromUsername?: string;
  text?: string;
  raw?: unknown;
}

function pickRandom(items: string[]): string | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Match an incoming comment against enabled flows and run the first match's
 * actions (public reply + optional DM). Idempotent per commentId.
 */
export async function processComment(c: IncomingComment) {
  if (!c.commentId) return { skipped: "no-comment-id" };

  // Atomic claim: the unique commentId makes concurrent/retried deliveries
  // collide here, so only one delivery proceeds (no double replies).
  try {
    await prisma.commentEvent.create({
      data: {
        commentId: c.commentId,
        mediaId: c.mediaId,
        fromUserId: c.fromUserId,
        fromUsername: c.fromUsername,
        text: c.text,
        raw: (c.raw ?? null) as object,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { skipped: "already-claimed" };
    throw e;
  }

  const markProcessed = () =>
    prisma.commentEvent.update({
      where: { commentId: c.commentId },
      data: { processed: true },
    });
  // Release the claim so a redelivery (within Meta's retry window) can retry
  // when nothing was delivered.
  const releaseClaim = () =>
    prisma.commentEvent
      .delete({ where: { commentId: c.commentId } })
      .catch(() => undefined);

  const creds = await getActiveCredentials();

  // Never react to our own comments (prevents reply loops).
  if (c.fromUserId && creds.igUserId && c.fromUserId === creds.igUserId) {
    await markProcessed();
    return { skipped: "own-comment" };
  }

  // O comentário abre a conversa da pessoa no painel.
  if (c.fromUserId) {
    await registrarMensagem({ igsid: c.fromUserId, username: c.fromUsername, direcao: "entrada", origem: "comentario", texto: c.text ?? "", mid: `comment:${c.commentId}` })
      .catch((e) => console.error("registrarMensagem", e));
  }
  if (await estaBloqueado(c.fromUserId)) {
    await markProcessed();
    return { skipped: "blocked-contact" };
  }

  const flows = await prisma.flow.findMany({ where: { enabled: true } });
  const text = (c.text ?? "").toLowerCase();

  const matched = flows.find((f) => {
    if (f.scope === "SPECIFIC_POST" && f.mediaId && f.mediaId !== c.mediaId) {
      return false;
    }
    if (f.matchType === "KEYWORD") {
      return f.keywords.some((k) => text.includes(k.toLowerCase()));
    }
    return true; // ANY
  });

  if (!matched) {
    await markProcessed();
    return { matched: false };
  }

  if (!creds.accessToken) {
    await prisma.activityLog.create({
      data: {
        type: "no_credentials",
        commentId: c.commentId,
        flowId: matched.id,
      },
    });
    await markProcessed();
    return { matched: true, flowId: matched.id, skipped: "no-credentials" };
  }

  const actions = await executarFluxo(creds, c, matched);

  const hadSuccess = actions.some((a) => !a.endsWith("_error"));
  const hadFailure = actions.some((a) => a.endsWith("_error"));

  // If every attempted action failed, nothing was delivered — release the
  // claim so a redelivery can retry cleanly (no risk of double-sending).
  if (hadFailure && !hadSuccess) {
    await releaseClaim();
    return { matched: true, flowId: matched.id, retry: true, actions };
  }

  await markProcessed();
  await notificar({
    tipo: "comentario", titulo: "Comentário respondido", destaque: c.fromUsername ? `@${c.fromUsername}` : null,
    texto: `comentou “${(c.text ?? "").slice(0, 80)}” e a automação “${matched.name}” respondeu.`,
    link: `/app/comentarios?comentario=${c.commentId}`, etiqueta: "concluido", chave: `cmt:${c.commentId}`,
  });
  return { matched: true, flowId: matched.id, actions };
}

type FluxoSalvo = Awaited<ReturnType<typeof prisma.flow.findFirstOrThrow>>;

/**
 * Executa as ações de uma automação num comentário: resposta pública e
 * direct. Usada pelo webhook (palavra-chave) e pelo painel ("Aplicar
 * automação" num comentário que não tinha a palavra). Devolve o que fez.
 */
export async function executarFluxo(
  creds: IgCredentials,
  c: { commentId: string; fromUserId?: string | null },
  matched: FluxoSalvo,
): Promise<string[]> {
  const actions: string[] = [];

  const publicMsg = pickRandom(matched.publicReplies);
  if (publicMsg) {
    const r = await replyToComment(creds, c.commentId, publicMsg);
    await prisma.activityLog.create({
      data: {
        type: r.ok ? "public_reply" : "public_reply_error",
        commentId: c.commentId,
        flowId: matched.id,
        detail: r as unknown as object,
      },
    });
    actions.push(r.ok ? "public_reply" : "public_reply_error");
  }

  // DM: prefer a multi-step flow (quick replies); otherwise the simple message.
  const dmFlow = asDmFlow(matched.dmFlow);
  if (dmFlow) {
    const entry = buildStepMessage(matched.id, dmFlow, dmFlow.entry);
    if (entry) {
      const r = await sendPrivateReply(
        creds,
        c.commentId,
        entry.text,
        entry.quickReplies,
      );
      await registrarEnvio(r, c.fromUserId, entry.text);
      await prisma.activityLog.create({
        data: {
          type: r.ok ? "dm_flow" : "dm_flow_error",
          commentId: c.commentId,
          flowId: matched.id,
          detail: r as unknown as object,
        },
      });
      actions.push(r.ok ? "dm_flow" : "dm_flow_error");
    }
  } else if (matched.dmMessage) {
    const r = await sendPrivateReply(creds, c.commentId, matched.dmMessage);
    await registrarEnvio(r, c.fromUserId, matched.dmMessage);
    await prisma.activityLog.create({
      data: {
        type: r.ok ? "dm" : "dm_error",
        commentId: c.commentId,
        flowId: matched.id,
        detail: r as unknown as object,
      },
    });
    actions.push(r.ok ? "dm" : "dm_error");
  }

  return actions;
}
