import { prisma } from "@/lib/db";
import { naoLidas } from "@/lib/conversas";
import { contarNaoLidas } from "@/lib/notificacoes";
import { env } from "@/lib/env";
import { isEncryptionEnabled } from "@/lib/crypto";
import { descreverFluxo } from "@/lib/fluxoTexto";

// Dados das telas do painel (/app). Tudo sai do banco: nenhum número inventado.

export type Periodo = 7 | 30 | 90;
export type StatusComentario = "respondido" | "erro" | "sem_automacao" | "pendente";

const DIA = 86_400_000;
const OK_RESPOSTA = ["public_reply"];
const OK_DM = ["dm", "dm_flow", "dm_step"];
const OK_ACOES = [...OK_RESPOSTA, ...OK_DM];

export async function contaConectada() {
  const a = await prisma.account.findFirst({ where: { accessToken: { not: null } }, orderBy: { createdAt: "desc" } });
  return a ? { id: a.id, igUserId: a.igUserId, username: a.username ?? a.igUserId } : null;
}

export async function getStatus() {
  const [conta, fluxosAtivos, pendentes, notificacoes] = await Promise.all([contaConectada(), prisma.flow.count({ where: { enabled: true } }), naoLidas(), contarNaoLidas()]);
  return { conta: conta?.username ?? null, conectada: Boolean(conta), fluxosAtivos, naoLidas: pendentes, notificacoes };
}

/** O que aconteceu com cada comentário, pelo log de ações. */
async function acoesDos(commentIds: string[]) {
  const porId = new Map<string, { ok: boolean; erro: boolean; flowId: string | null }>();
  if (!commentIds.length) return porId;
  const logs = await prisma.activityLog.findMany({
    where: { commentId: { in: commentIds } },
    select: { commentId: true, type: true, flowId: true },
  });
  for (const l of logs) {
    if (!l.commentId) continue;
    const s = porId.get(l.commentId) ?? { ok: false, erro: false, flowId: null };
    if (OK_ACOES.includes(l.type)) s.ok = true;
    else s.erro = true;
    s.flowId = s.flowId ?? l.flowId;
    porId.set(l.commentId, s);
  }
  return porId;
}

function statusDe(processed: boolean, s?: { ok: boolean; erro: boolean }): StatusComentario {
  if (s?.ok) return "respondido";
  if (s?.erro) return "erro";
  return processed ? "sem_automacao" : "pendente";
}

export async function getInicio(periodo: Periodo) {
  const agora = new Date();
  const iniAtual = new Date(agora.getTime() - periodo * DIA);
  const iniAnterior = new Date(agora.getTime() - 2 * periodo * DIA);
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const [primeiros, conta, flows, execs, recentes, dmsMes] = await Promise.all([
    prisma.commentEvent.groupBy({ by: ["fromUserId"], where: { fromUserId: { not: null } }, _min: { receivedAt: true } }),
    contaConectada(),
    prisma.flow.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.activityLog.groupBy({ by: ["flowId"], where: { flowId: { not: null }, type: { in: OK_ACOES } }, _count: { _all: true } }),
    prisma.commentEvent.findMany({ orderBy: { receivedAt: "desc" }, take: 8 }),
    prisma.activityLog.count({ where: { type: { in: OK_DM }, createdAt: { gte: inicioMes } } }),
  ]);

  async function janela(de: Date, ate: Date) {
    const [comentarios, respostas, dms] = await Promise.all([
      prisma.commentEvent.count({ where: { receivedAt: { gte: de, lt: ate } } }),
      prisma.activityLog.count({ where: { type: { in: OK_RESPOSTA }, createdAt: { gte: de, lt: ate } } }),
      prisma.activityLog.count({ where: { type: { in: OK_DM }, createdAt: { gte: de, lt: ate } } }),
    ]);
    const novos = primeiros.filter((p) => p._min.receivedAt && p._min.receivedAt >= de && p._min.receivedAt < ate).length;
    return { comentarios, respostas, dms, novos };
  }
  const [atual, anterior] = await Promise.all([janela(iniAtual, agora), janela(iniAnterior, iniAtual)]);

  const acoes = await acoesDos(recentes.map((c) => c.commentId));
  const execPor = new Map(execs.map((e) => [e.flowId, e._count._all]));
  return {
    metricas: { atual, anterior },
    conta,
    automacaoLigada: flows.some((f) => f.enabled),
    recentes: recentes.map((c) => ({
      id: c.commentId,
      username: c.fromUsername ?? "",
      texto: c.text ?? "",
      em: c.receivedAt.toISOString(),
      status: statusDe(c.processed, acoes.get(c.commentId)),
    })),
    fluxos: flows.map((f) => ({ id: f.id, nome: f.name, ativo: f.enabled, descricao: descreverFluxo(f), execucoes: execPor.get(f.id) ?? 0 })),
    uso: { contatos: primeiros.length, dmsMes, automacoes: flows.length },
  };
}

export async function getExecucoesPorFluxo() {
  const execs = await prisma.activityLog.groupBy({ by: ["flowId"], where: { flowId: { not: null }, type: { in: OK_ACOES } }, _count: { _all: true } });
  return Object.fromEntries(execs.map((e) => [e.flowId as string, e._count._all])) as Record<string, number>;
}

/** Quando cada automação respondeu pela última vez (ISO). */
export async function getUltimaPorFluxo() {
  const ult = await prisma.activityLog.groupBy({ by: ["flowId"], where: { flowId: { not: null }, type: { in: OK_ACOES } }, _max: { createdAt: true } });
  return Object.fromEntries(ult.map((u) => [u.flowId as string, u._max.createdAt?.toISOString() ?? null])) as Record<string, string | null>;
}

export async function getPalavras() {
  const desde = new Date(Date.now() - 30 * DIA);
  const [flows, textos] = await Promise.all([
    prisma.flow.findMany({ where: { matchType: "KEYWORD" }, orderBy: { createdAt: "desc" } }),
    prisma.commentEvent.findMany({ where: { receivedAt: { gte: desde } }, select: { text: true }, take: 5000 }),
  ]);
  const minusculos = textos.map((t) => (t.text ?? "").toLowerCase());
  const linhas = flows.flatMap((f) =>
    f.keywords.map((k) => ({
      palavra: k,
      fluxoId: f.id,
      fluxo: f.name,
      ativo: f.enabled,
      escopo: f.scope === "SPECIFIC_POST" ? "Um post" : "Todos os posts",
      usos: minusculos.filter((t) => t.includes(k.toLowerCase())).length,
    })),
  );
  return { linhas, comentarios30: textos.length };
}

export async function getConfiguracoes() {
  const contas = await prisma.account.findMany({ orderBy: { createdAt: "desc" } });
  return {
    contas: contas.map((a) => ({
      id: a.id,
      igUserId: a.igUserId,
      username: a.username,
      conectada: Boolean(a.accessToken),
      desde: a.createdAt.toISOString(),
    })),
    meta: {
      appId: Boolean(env.metaAppId),
      appSecret: Boolean(env.metaAppSecret),
      verifyToken: Boolean(env.igVerifyToken),
      redirect: env.metaRedirectUri || null,
    },
    criptografia: isEncryptionEnabled(),
    senhaPainel: Boolean(process.env.PAINEL_SENHA),
  };
}
