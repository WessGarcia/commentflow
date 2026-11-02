import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActiveCredentials } from "@/lib/credentials";
import { sendDm } from "@/lib/meta";
import { asDmFlow, buildStepMessage } from "@/lib/flowTypes";
import { estaBloqueado, registrarEnvio } from "@/lib/conversas";
import { iniciarExecucao } from "@/lib/motor";
import { notificar } from "@/lib/notificacoes";
import { GATILHOS, type TipoGatilho } from "@/lib/gatilhos";
import { temPalavra } from "@/lib/texto";

/**
 * Gatilhos que chegam pelo direct (resposta ao story, menção no story,
 * reação): a pessoa já falou com a conta, então a primeira mensagem vai
 * direto para ela, sem resposta privada a comentário. Uma vez por evento:
 * a Meta reentrega webhook, e a chave em ProcessedEvent segura a repetição.
 */
export async function dispararPorMensagem(tipo: Exclude<TipoGatilho, "comentario" | "live">, e: { igsid: string; texto: string; chave: string; username?: string | null }) {
  if (!e.igsid || (await estaBloqueado(e.igsid))) return { skipped: "blocked-or-empty" };

  const fluxos = await prisma.flow.findMany({ where: { enabled: true, tipo }, orderBy: { createdAt: "asc" } });
  const usaPalavra = GATILHOS[tipo].palavras !== "nenhuma";
  const fluxo = fluxos.find((f) => !usaPalavra || f.matchType === "ANY" || temPalavra(e.texto, f.keywords));
  if (!fluxo) return { matched: false };

  try {
    await prisma.processedEvent.create({ data: { key: `gatilho:${tipo}:${e.chave}` } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { skipped: "duplicate-event" };
    throw err;
  }

  const creds = await getActiveCredentials();
  if (!creds.accessToken) {
    await prisma.activityLog.create({ data: { type: "no_credentials", flowId: fluxo.id } });
    return { skipped: "no-credentials" };
  }

  let ok = false;
  if (fluxo.grafo) {
    ok = (await iniciarExecucao(fluxo, { commentId: null, fromUserId: e.igsid })).every((a) => !a.endsWith("_error"));
  } else {
    const dmFlow = asDmFlow(fluxo.dmFlow);
    const msg = dmFlow ? buildStepMessage(fluxo.id, dmFlow, dmFlow.entry) : fluxo.dmMessage ? { text: fluxo.dmMessage, quickReplies: [] } : null;
    if (msg) {
      const r = await sendDm(creds, { id: e.igsid }, msg.text, msg.quickReplies);
      await registrarEnvio(r, e.igsid, msg.text);
      await prisma.activityLog.create({ data: { type: r.ok ? (dmFlow ? "dm_flow" : "dm") : dmFlow ? "dm_flow_error" : "dm_error", flowId: fluxo.id, detail: r as unknown as object } });
      ok = r.ok;
    }
  }
  if (ok) {
    await notificar({
      tipo: "comentario", titulo: GATILHOS[tipo].rotulo, destaque: e.username ? `@${e.username}` : null,
      texto: `disparou a automação “${fluxo.name}”.`, link: "/app/conversas", etiqueta: "concluido", chave: `disparo:${tipo}:${e.chave}`,
    });
  }
  return { matched: true, flowId: fluxo.id, ok };
}
