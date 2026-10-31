import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { verifySignature } from "@/lib/signature";
import { processComment } from "@/lib/processComment";
import { processMessaging } from "@/lib/processMessaging";
import { registrarMensagem } from "@/lib/conversas";
import { receberTexto } from "@/lib/motor";
import { dispararPorMensagem } from "@/lib/disparo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook verification handshake.
 * Meta calls GET with hub.mode / hub.verify_token / hub.challenge.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");

  if (mode === "subscribe" && token && token === env.igVerifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

interface CommentChange {
  field?: string;
  value?: {
    id?: string;
    text?: string;
    media?: { id?: string };
    from?: { id?: string; username?: string };
  };
}

interface MessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    is_deleted?: boolean;
    quick_reply?: { payload?: string };
    attachments?: Array<{ type?: string }>;
    reply_to?: { story?: { id?: string; url?: string } };
  };
  reaction?: { mid?: string; action?: "react" | "unreact"; reaction?: string; emoji?: string };
  postback?: { payload?: string; title?: string; mid?: string };
}

/** O que a mensagem diz, em texto: anexos viram uma etiqueta. */
function textoDe(ev: MessagingEvent) {
  if (ev.message?.text) return ev.message.text;
  if (ev.postback?.title) return ev.postback.title;
  const tipo = ev.message?.attachments?.[0]?.type;
  if (tipo) return { image: "📷 Foto", video: "🎥 Vídeo", audio: "🎤 Áudio", share: "🔗 Compartilhamento", story_mention: "📸 Mencionou você no story", ig_reel: "🎬 Reel" }[tipo] ?? "📎 Anexo";
  return null;
}

/** Guarda a mensagem na conversa: as da pessoa e as que você mandou pelo app. */
async function guardarMensagem(ev: MessagingEvent) {
  const texto = textoDe(ev);
  const mid = ev.message?.mid ?? ev.postback?.mid;
  if (!texto || ev.message?.is_deleted) return;
  const quando = ev.timestamp ? new Date(ev.timestamp) : undefined;
  if (ev.message?.is_echo) {
    if (ev.recipient?.id) await registrarMensagem({ igsid: ev.recipient.id, direcao: "saida", origem: "instagram", texto, mid, quando });
    return;
  }
  if (ev.sender?.id) await registrarMensagem({ igsid: ev.sender.id, direcao: "entrada", origem: "pessoa", texto, mid, quando });
}

interface WebhookPayload {
  entry?: Array<{
    changes?: CommentChange[];
    messaging?: MessagingEvent[];
  }>;
}

/**
 * Event ingestion. Verifies the signature, then handles:
 * - "comments" changes (someone commented)
 * - messaging events (someone tapped a quick reply / postback)
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");

  if (!verifySignature(raw, sig, env.metaAppSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const tasks: Promise<unknown>[] = [];

  for (const entry of payload.entry ?? []) {
    // Comments
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments" && change.field !== "live_comments") continue;
      const v = change.value ?? {};
      if (!v.id) continue;
      // Self-comment loops are prevented in processComment, which compares
      // against the connected account's id (from the DB), not env.igUserId.
      tasks.push(
        processComment({
          commentId: v.id,
          mediaId: v.media?.id,
          fromUserId: v.from?.id,
          fromUsername: v.from?.username,
          text: v.text,
          raw: change,
          live: change.field === "live_comments",
        }).catch((e) => console.error("processComment error", e)),
      );
    }

    // Messaging (quick replies / postbacks)
    for (const event of entry.messaging ?? []) {
      tasks.push(guardarMensagem(event).catch((e) => console.error("guardarMensagem error", e)));
      if (event.message?.is_echo) continue; // our own outbound echoes don't trigger flows
      const de = event.sender?.id;
      if (de) {
        // gatilhos que chegam pelo direct
        if (event.reaction?.action === "react") {
          tasks.push(dispararPorMensagem("reacao", { igsid: de, texto: event.reaction.emoji ?? "", chave: `${event.reaction.mid}:${de}:${event.timestamp ?? ""}` }).catch((e) => console.error("reacao error", e)));
          continue;
        }
        if (event.message?.attachments?.some((a) => a.type === "story_mention")) {
          tasks.push(dispararPorMensagem("story_mencao", { igsid: de, texto: "", chave: event.message.mid ?? `${de}:${event.timestamp}` }).catch((e) => console.error("story_mencao error", e)));
          continue;
        }
        if (event.message?.reply_to?.story) {
          tasks.push(dispararPorMensagem("story_resposta", { igsid: de, texto: event.message.text ?? "", chave: event.message.mid ?? `${de}:${event.timestamp}` }).catch((e) => console.error("story_resposta error", e)));
          continue;
        }
      }
      const qrPayload =
        event.message?.quick_reply?.payload ?? event.postback?.payload;
      if (!qrPayload) {
        // texto livre: pode ser a resposta de uma coleta do construtor
        const texto = event.message?.text;
        if (texto && event.sender?.id) tasks.push(receberTexto(event.sender.id, texto).catch((e) => console.error("receberTexto error", e)));
        continue;
      }
      tasks.push(
        processMessaging({
          senderId: event.sender?.id,
          payload: qrPayload,
          mid: event.message?.mid,
        }).catch((e) => console.error("processMessaging error", e)),
      );
    }
  }

  await Promise.allSettled(tasks);
  return new Response("EVENT_RECEIVED", { status: 200 });
}
