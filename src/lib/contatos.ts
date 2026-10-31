import { prisma } from "@/lib/db";
import { etapaDoContato, type EtapaId } from "@/lib/quadro";

export type ContatoLinha = {
  id: string;
  igsid: string;
  username: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  notas: string | null;
  tags: string[];
  status: string;
  etapa: EtapaId;
  /** a etapa foi escolhida por você (e não pelo que a pessoa fez) */
  manual: boolean;
  desde: string;
  ultimo: string | null;
  comentarios: number;
  recebeu: boolean;
  respondeu: boolean;
  ultimoComentario: string | null;
};

/** Todo mundo que comentou ou mandou direct, com o que aconteceu com cada um. */
export async function listarContatos(): Promise<ContatoLinha[]> {
  const [contatos, porTipo, comentarios] = await Promise.all([
    prisma.contact.findMany({ where: { bloqueado: false }, orderBy: [{ ultimaMsg: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }], take: 5000 }),
    prisma.message.groupBy({ by: ["contactId", "direcao", "origem"], _count: { _all: true } }),
    prisma.commentEvent.findMany({ where: { fromUserId: { not: null } }, orderBy: { receivedAt: "desc" }, select: { fromUserId: true, text: true }, take: 10000 }),
  ]);

  const recebeu = new Set<string>();
  const respondeu = new Set<string>();
  for (const g of porTipo) {
    if (g.direcao === "saida") recebeu.add(g.contactId);
    if (g.direcao === "entrada" && g.origem === "pessoa") respondeu.add(g.contactId);
  }
  const qtdComentarios = new Map<string, number>();
  const ultimoComentario = new Map<string, string>();
  for (const c of comentarios) {
    const id = c.fromUserId as string;
    qtdComentarios.set(id, (qtdComentarios.get(id) ?? 0) + 1);
    if (!ultimoComentario.has(id)) ultimoComentario.set(id, c.text ?? "");
  }

  return contatos.map((c) => {
    const r = recebeu.has(c.id);
    const s = respondeu.has(c.id);
    const etapa = etapaDoContato({ recebeu: r, respondeu: s, etapa: c.etapa });
    return {
      id: c.id, igsid: c.igsid, username: c.username, nome: c.nome, email: c.email, telefone: c.telefone, notas: c.notas,
      tags: c.tags, status: c.status, etapa, manual: c.etapa !== "novo", desde: c.createdAt.toISOString(),
      ultimo: c.ultimaMsg?.toISOString() ?? null, comentarios: qtdComentarios.get(c.igsid) ?? 0, recebeu: r, respondeu: s,
      ultimoComentario: ultimoComentario.get(c.igsid) ?? null,
    };
  });
}

/** CSV com os dados de contato, para levar a base para onde quiser. */
export function contatosEmCsv(linhas: ContatoLinha[]) {
  const cel = (v: unknown) => {
    const s = v == null ? "" : String(v);
    // aspas para quem tem vírgula/quebra; apóstrofo evita fórmula ao abrir no Excel
    const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n;]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  const cab = ["usuario", "nome", "email", "telefone", "etiquetas", "etapa", "status", "comentarios", "recebeu_direct", "respondeu", "contato_desde", "ultima_interacao", "notas"];
  const corpo = linhas.map((c) =>
    [c.username ?? "", c.nome, c.email, c.telefone, c.tags.join(" "), c.etapa, c.status, c.comentarios, c.recebeu ? "sim" : "nao", c.respondeu ? "sim" : "nao", c.desde, c.ultimo, c.notas].map(cel).join(","),
  );
  return "\uFEFF" + [cab.join(","), ...corpo].join("\n");
}
