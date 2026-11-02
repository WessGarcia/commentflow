import { prisma } from "@/lib/db";
import type { Periodo } from "@/lib/painel";
import { normalizar } from "@/lib/texto";

/**
 * Insights (como na Mandei): o período em números que dá para conferir no
 * banco, comparado com o período anterior do mesmo tamanho. Conversão aqui é
 * "respondeu ÷ recebeu o direct": é o que o CommentFlow consegue medir hoje.
 */

const DIA = 86_400_000;
const DM_INICIAL = ["dm", "dm_flow"];

export type Frase = { titulo: string; corpo: string; tom: "verde" | "roxo" | "ambar" };

async function janela(de: Date, ate: Date) {
  const [conversas, respostas, receberam, responderam] = await Promise.all([
    prisma.activityLog.count({ where: { type: { in: DM_INICIAL }, createdAt: { gte: de, lt: ate } } }),
    prisma.activityLog.count({ where: { type: "public_reply", createdAt: { gte: de, lt: ate } } }),
    prisma.message.findMany({ where: { direcao: "saida", origem: "automacao", createdAt: { gte: de, lt: ate } }, distinct: ["contactId"], select: { contactId: true } }),
    prisma.message.findMany({ where: { direcao: "entrada", origem: "pessoa", createdAt: { gte: de, lt: ate } }, distinct: ["contactId"], select: { contactId: true } }),
  ]);
  const quemRecebeu = new Set(receberam.map((r) => r.contactId));
  const voltaram = responderam.filter((r) => quemRecebeu.has(r.contactId)).length;
  const conversao = quemRecebeu.size ? Math.round((voltaram / quemRecebeu.size) * 100) : 0;
  return { conversas, respostas, conversao, receberam: quemRecebeu.size };
}

export async function getInsights(periodo: Periodo) {
  const agora = new Date();
  const iniAtual = new Date(agora.getTime() - periodo * DIA);
  const iniAnterior = new Date(agora.getTime() - 2 * periodo * DIA);

  const [atual, anterior, dmsPeriodo, execs, flows, comentariosPeriodo, inicio] = await Promise.all([
    janela(iniAtual, agora),
    janela(iniAnterior, iniAtual),
    prisma.activityLog.findMany({ where: { type: { in: DM_INICIAL }, createdAt: { gte: iniAtual } }, select: { createdAt: true } }),
    prisma.activityLog.groupBy({ by: ["flowId"], where: { flowId: { not: null }, type: { in: ["public_reply", "dm", "dm_flow", "dm_step"] } }, _count: { _all: true } }),
    prisma.flow.findMany({ select: { id: true, name: true, keywords: true, matchType: true } }),
    prisma.activityLog.findMany({ where: { createdAt: { gte: iniAtual }, flowId: { not: null }, commentId: { not: null } }, distinct: ["commentId"], select: { commentId: true, flowId: true } }),
    prisma.flow.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);

  // série diária: directs que a automação abriu, por dia (fuso do servidor)
  const chave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const porDia = new Map<string, number>();
  for (const l of dmsPeriodo) porDia.set(chave(l.createdAt), (porDia.get(chave(l.createdAt)) ?? 0) + 1);
  const serie = Array.from({ length: periodo }, (_, i) => {
    const d = new Date(agora.getTime() - (periodo - 1 - i) * DIA);
    return { dia: chave(d), rotulo: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", ""), n: porDia.get(chave(d)) ?? 0 };
  });

  const nomeDe = new Map(flows.map((f) => [f.id, f.name]));
  const fluxos = execs
    .map((e) => ({ nome: nomeDe.get(e.flowId as string) ?? "Automação apagada", execucoes: e._count._all }))
    .sort((a, b) => b.execucoes - a.execucoes)
    .slice(0, 6);

  // fatias: quantos comentários do período cada automação atendeu
  const porFluxo = new Map<string, number>();
  for (const c of comentariosPeriodo) porFluxo.set(c.flowId as string, (porFluxo.get(c.flowId as string) ?? 0) + 1);
  const totalExec = comentariosPeriodo.length;
  const fatias = [...porFluxo.entries()]
    .map(([id, n]) => ({ nome: nomeDe.get(id) ?? "Automação apagada", n, pct: totalExec ? Math.round((n / totalExec) * 100) : 0 }))
    .sort((a, b) => b.n - a.n);

  // palavras: em quantos comentários do período cada palavra-chave apareceu
  const textos = await prisma.commentEvent.findMany({ where: { receivedAt: { gte: iniAtual } }, select: { text: true }, take: 10000 });
  const minusculos = textos.map((t) => normalizar(t.text ?? ""));
  const palavras = Array.from(new Set(flows.filter((f) => f.matchType === "KEYWORD").flatMap((f) => f.keywords.map(normalizar))));
  const contagem = palavras.map((p) => ({ palavra: p, n: minusculos.filter((t) => t.includes(p)).length })).filter((p) => p.n > 0);
  const somaPalavras = contagem.reduce((a, p) => a + p.n, 0);
  const topPalavras = contagem.sort((a, b) => b.n - a.n).slice(0, 6).map((p) => ({ ...p, pct: somaPalavras ? Math.round((p.n / somaPalavras) * 100) : 0 }));

  const frases: Frase[] = [];
  const delta = anterior.conversas ? Math.round(((atual.conversas - anterior.conversas) / anterior.conversas) * 100) : null;
  if (delta != null) {
    const dif = Math.abs(atual.conversas - anterior.conversas);
    frases.push({ titulo: `Suas conversas ${delta >= 0 ? "cresceram" : "caíram"} ${Math.abs(delta)}%`, corpo: `${dif} conversa${dif === 1 ? "" : "s"} a ${delta >= 0 ? "mais" : "menos"} que nos ${periodo} dias anteriores.`, tom: delta >= 0 ? "verde" : "ambar" });
  } else if (atual.conversas) {
    frases.push({ titulo: `${atual.conversas} conversa${atual.conversas === 1 ? "" : "s"} iniciada${atual.conversas === 1 ? "" : "s"}`, corpo: "Primeiro período com automação rodando: ainda não há base de comparação.", tom: "roxo" });
  }
  if (atual.receberam) {
    frases.push({ titulo: `${atual.conversao}% de quem recebeu o direct respondeu`, corpo: anterior.receberam ? `Era ${anterior.conversao}% no período anterior.` : "Resposta no direct é a conversão que o CommentFlow consegue medir.", tom: atual.conversao >= anterior.conversao ? "verde" : "ambar" });
  }
  frases.push({ titulo: "Nenhuma cobrança por contato ou mensagem", corpo: "Comentário, resposta pública, direct e conversa com botões não pesam no bolso: a ferramenta é sua.", tom: "roxo" });

  return {
    periodo,
    m: { atual, anterior },
    serie,
    fluxos,
    fatias,
    totalExec,
    topPalavras,
    frases,
    desde: inicio?.createdAt.toISOString() ?? null,
  };
}
