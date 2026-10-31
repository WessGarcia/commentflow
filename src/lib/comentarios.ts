import { prisma } from "@/lib/db";
import { getActiveCredentials } from "@/lib/credentials";
import { hideComment, replyToComment, sendPrivateReply, type GraphResult } from "@/lib/meta";
import { executarFluxo } from "@/lib/processComment";
import { registrarEnvio } from "@/lib/conversas";

/**
 * Comentários e moderação (como na Mandei): tudo que o webhook entregou, o
 * que a automação fez com cada um e o que você faz na mão (responder em
 * público, mandar direct, ocultar, aplicar uma automação, marcar resolvido).
 */

export type Sentimento = "Positivo" | "Dúvida" | "Interesse" | "Negativo" | "Neutro";
export type StatusModeracao = "nao_respondido" | "automacao" | "resolvido";

/** Um palpite simples pelo texto: ajuda a achar dúvida e reclamação rápido. */
export function sentimento(texto: string, temFluxo: boolean): Sentimento {
  const t = (texto || "").toLowerCase();
  if (/\b(lixo|péssimo|pessimo|horrível|horrivel|golpe|mentira|odiei|ruim|nunca mais|decepcion)/.test(t)) return "Negativo";
  if (temFluxo) return "Interesse";
  if (t.includes("?") || /\b(como|quanto|onde|qual|quando|tem|funciona)\b/.test(t)) return "Dúvida";
  if (/\b(top|show|incrível|incrivel|amei|obrigad|parabéns|parabens|sensacional|demais|massa)/.test(t) || /[👏🙌❤😍🔥💜✨]/u.test(texto)) return "Positivo";
  return "Neutro";
}

export type ComentarioModeracao = {
  id: string;
  username: string | null;
  fromUserId: string | null;
  texto: string;
  mediaId: string | null;
  em: string;
  fluxo: string | null;
  respondeuPublico: boolean;
  mandouDm: boolean;
  erro: string | null;
  ocultado: boolean;
  respostaManual: string | null;
  status: StatusModeracao;
  sentimento: Sentimento;
};

const ROTULO_ERRO: Record<string, string> = {
  public_reply_error: "a Meta recusou a resposta pública",
  dm_error: "a Meta recusou o direct",
  dm_flow_error: "a Meta recusou o direct",
  no_credentials: "nenhum Instagram conectado",
};

export async function listarComentarios(): Promise<ComentarioModeracao[]> {
  const [rows, flows] = await Promise.all([
    prisma.commentEvent.findMany({ orderBy: { receivedAt: "desc" }, take: 500 }),
    prisma.flow.findMany({ select: { id: true, name: true } }),
  ]);
  const logs = await prisma.activityLog.findMany({ where: { commentId: { in: rows.map((r) => r.commentId) } }, select: { commentId: true, type: true, flowId: true } });
  const nomeFluxo = new Map(flows.map((f) => [f.id, f.name]));
  const porComentario = new Map<string, typeof logs>();
  for (const l of logs) porComentario.set(l.commentId!, [...(porComentario.get(l.commentId!) ?? []), l]);

  return rows.map((c) => {
    const ls = porComentario.get(c.commentId) ?? [];
    const flowId = ls.find((l) => l.flowId)?.flowId ?? null;
    const respondeuPublico = ls.some((l) => l.type === "public_reply");
    const mandouDm = ls.some((l) => l.type === "dm" || l.type === "dm_flow");
    const erro = ls.map((l) => ROTULO_ERRO[l.type]).find(Boolean) ?? null;
    const automacaoOk = respondeuPublico || mandouDm;
    const status: StatusModeracao = c.resolvido || c.respostaManual ? "resolvido" : automacaoOk ? "automacao" : "nao_respondido";
    return {
      id: c.commentId,
      username: c.fromUsername,
      fromUserId: c.fromUserId,
      texto: c.text ?? "",
      mediaId: c.mediaId,
      em: c.receivedAt.toISOString(),
      fluxo: flowId ? (nomeFluxo.get(flowId) ?? "automação apagada") : null,
      respondeuPublico,
      mandouDm,
      erro: automacaoOk ? null : erro,
      ocultado: c.ocultado,
      respostaManual: c.respostaManual,
      status,
      sentimento: sentimento(c.text ?? "", Boolean(flowId)),
    };
  });
}

/** Os quatro números do topo: últimos 7 dias contra os 7 anteriores. */
export function metricasComentarios(itens: ComentarioModeracao[]) {
  const agora = Date.now();
  const DIA = 86_400_000;
  const noPeriodo = (de: number, ate: number) => itens.filter((c) => { const t = Date.parse(c.em); return t >= de && t < ate; });
  const atual = noPeriodo(agora - 7 * DIA, agora + 1);
  const anterior = noPeriodo(agora - 14 * DIA, agora - 7 * DIA);
  const respondidos = (l: ComentarioModeracao[]) => l.filter((c) => c.status !== "nao_respondido").length;
  return {
    atual: { recebidos: atual.length, respondidos: respondidos(atual) },
    anterior: { recebidos: anterior.length, respondidos: respondidos(anterior) },
    aguardando: itens.filter((c) => c.status === "nao_respondido" && !c.ocultado).length,
    ocultados: itens.filter((c) => c.ocultado).length,
  };
}

function erroDaMeta(r: GraphResult, padrao: string) {
  const msg = (r.body as { error?: { message?: string } } | null)?.error?.message;
  return msg ? `${padrao}: ${msg}` : `${padrao}.`;
}

export type AcaoComentario =
  | { acao: "responder"; texto: string }
  | { acao: "dm"; texto: string }
  | { acao: "ocultar" }
  | { acao: "mostrar" }
  | { acao: "aplicar"; flowId: string }
  | { acao: "status"; resolvido: boolean };

/** Faz no Instagram o que você pediu no painel e guarda o resultado. */
export async function agirNoComentario(commentId: string, a: AcaoComentario): Promise<{ ok: true; aviso: string } | { ok: false; erro: string }> {
  const c = await prisma.commentEvent.findUnique({ where: { commentId } });
  if (!c) return { ok: false, erro: "Comentário não encontrado." };

  if (a.acao === "status") {
    await prisma.commentEvent.update({ where: { commentId }, data: { resolvido: a.resolvido } });
    return { ok: true, aviso: a.resolvido ? "Marcado como resolvido." : "Marcado como não respondido." };
  }

  const creds = await getActiveCredentials();
  if (!creds.accessToken) return { ok: false, erro: "Conecte o Instagram em Configurações para agir por aqui." };

  switch (a.acao) {
    case "responder": {
      const r = await replyToComment(creds, commentId, a.texto);
      if (!r.ok) return { ok: false, erro: erroDaMeta(r, "A Meta recusou a resposta") };
      await prisma.commentEvent.update({ where: { commentId }, data: { respostaManual: a.texto, resolvido: true } });
      return { ok: true, aviso: "Respondido no Instagram." };
    }
    case "dm": {
      // resposta privada: uma por comentário, em até 7 dias (regra da Meta)
      const r = await sendPrivateReply(creds, commentId, a.texto);
      if (!r.ok) return { ok: false, erro: erroDaMeta(r, "A Meta recusou o direct (cada comentário aceita um só, em até 7 dias)") };
      await registrarEnvio(r, c.fromUserId, a.texto, "humano");
      await prisma.commentEvent.update({ where: { commentId }, data: { resolvido: true } });
      return { ok: true, aviso: "Direct enviado." };
    }
    case "ocultar":
    case "mostrar": {
      const ocultar = a.acao === "ocultar";
      const r = await hideComment(creds, commentId, ocultar);
      if (!r.ok) return { ok: false, erro: erroDaMeta(r, `A Meta não deixou ${ocultar ? "ocultar" : "mostrar"} o comentário`) };
      await prisma.commentEvent.update({ where: { commentId }, data: { ocultado: ocultar } });
      return { ok: true, aviso: ocultar ? "Comentário ocultado. Só você e quem comentou continuam vendo." : "Comentário visível de novo." };
    }
    case "aplicar": {
      const flow = await prisma.flow.findUnique({ where: { id: a.flowId } });
      if (!flow) return { ok: false, erro: "Automação não encontrada." };
      const feitas = await executarFluxo(creds, { commentId, fromUserId: c.fromUserId }, flow);
      if (!feitas.length) return { ok: false, erro: "Essa automação não tem resposta pública nem direct para mandar." };
      if (feitas.every((x) => x.endsWith("_error"))) return { ok: false, erro: "A Meta recusou as respostas da automação." };
      await prisma.commentEvent.update({ where: { commentId }, data: { processed: true } });
      return { ok: true, aviso: `Automação “${flow.name}” aplicada.` };
    }
  }
}
