import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActiveCredentials } from "@/lib/credentials";
import { base, sendDm, type GraphResult } from "@/lib/meta";
import { notificar } from "@/lib/notificacoes";

/**
 * Conversas: cada pessoa é um Contact e cada mensagem um Message. Tudo que
 * entra (comentário, direct, toque em botão) e tudo que sai (automação,
 * resposta pelo painel, resposta pelo app do Instagram) passa por
 * registrarMensagem, que não duplica: o "mid" da Meta é único.
 */

export type Direcao = "entrada" | "saida";
export type Origem = "pessoa" | "comentario" | "automacao" | "humano" | "instagram";

/** A Meta só deixa responder por 24 h depois da última mensagem da pessoa. */
export const JANELA_MS = 24 * 3600 * 1000;

const depois = (a: Date | null, b: Date) => (a && a > b ? a : b);

function duplicado(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function contatoDe(igsid: string, username?: string | null) {
  return prisma.contact.upsert({
    where: { igsid },
    update: username ? { username } : {},
    create: { igsid, username: username ?? null },
  });
}

export async function registrarMensagem(m: {
  igsid: string;
  username?: string | null;
  direcao: Direcao;
  origem: Origem;
  texto: string;
  mid?: string | null;
  quando?: Date;
}) {
  const contato = await contatoDe(m.igsid, m.username);
  const quando = m.quando ?? new Date();
  try {
    await prisma.message.create({
      data: { contactId: contato.id, mid: m.mid ?? null, direcao: m.direcao, origem: m.origem, texto: m.texto, createdAt: quando },
    });
  } catch (e) {
    if (!duplicado(e)) throw e;
    // O eco do Instagram pode chegar antes da resposta da API: quem enviou
    // (automação ou painel) vence o rótulo genérico "instagram".
    if (m.mid && (m.origem === "automacao" || m.origem === "humano")) {
      await prisma.message.update({ where: { mid: m.mid }, data: { origem: m.origem } });
    }
    return contato;
  }
  await prisma.contact.update({
    where: { id: contato.id },
    // avisos atrasados (a Meta reenvia) não fazem a conversa voltar no tempo
    data: {
      ultimaMsg: depois(contato.ultimaMsg, quando),
      ...(m.direcao === "entrada" && m.origem === "pessoa" ? { ultimaEntrada: depois(contato.ultimaEntrada, quando) } : {}),
    },
  });
  if (!contato.username && m.direcao === "entrada") void completarPerfil(contato.id, m.igsid);
  if (m.direcao === "entrada" && m.origem === "pessoa") {
    await notificar({
      tipo: "mensagem", titulo: "Nova mensagem no direct", destaque: contato.username ? `@${contato.username}` : null,
      texto: m.texto.length > 120 ? `${m.texto.slice(0, 117)}...` : m.texto, link: `/app/conversas?contato=${contato.id}`, etiqueta: "novo",
      chave: m.mid ? `msg:${m.mid}` : null,
    });
  }
  return contato;
}

/** Registra o que a automação mandou, se a Meta aceitou. */
export async function registrarEnvio(r: GraphResult, igsid: string | undefined | null, texto: string, origem: "automacao" | "humano" = "automacao") {
  if (!r.ok) return;
  const body = (r.body ?? {}) as { message_id?: string; recipient_id?: string };
  const destino = igsid || body.recipient_id;
  if (!destino) return;
  await registrarMensagem({ igsid: destino, direcao: "saida", origem, texto, mid: body.message_id ?? null }).catch((e) => console.error("registrarEnvio", e));
}

/** Quem manda direct sem ter comentado chega sem @: busca o perfil uma vez. */
async function completarPerfil(contactId: string, igsid: string) {
  try {
    const creds = await getActiveCredentials();
    if (!creds.accessToken) return;
    const r = await fetch(`${base()}/${igsid}?fields=username,name&access_token=${encodeURIComponent(creds.accessToken)}`);
    if (!r.ok) return;
    const p = (await r.json()) as { username?: string; name?: string };
    if (p.username || p.name) await prisma.contact.update({ where: { id: contactId }, data: { username: p.username ?? undefined, nome: p.name ?? undefined } });
  } catch {
    // perfil é enfeite: sem ele a conversa segue com o ID
  }
}

export async function estaBloqueado(igsid: string | undefined | null) {
  if (!igsid) return false;
  const c = await prisma.contact.findUnique({ where: { igsid }, select: { bloqueado: true } });
  return Boolean(c?.bloqueado);
}

// ------------------------------------------------------------- painel

export type ItemConversa = {
  id: string;
  username: string | null;
  nome: string | null;
  igsid: string;
  ultima: string | null;
  origemUltima: string | null;
  em: string | null;
  pendente: boolean;
  atendimento: boolean;
  tags: string[];
};

/** A lista da caixa de entrada: quem tem alguma mensagem, da mais recente para trás. */
export async function listarConversas(): Promise<ItemConversa[]> {
  const contatos = await prisma.contact.findMany({
    where: { bloqueado: false, mensagens: { some: {} } },
    orderBy: { ultimaMsg: { sort: "desc", nulls: "last" } },
    take: 300,
    include: { mensagens: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return contatos.map((c) => {
    const u = c.mensagens[0];
    const dela = u?.direcao === "entrada" && u.origem === "pessoa";
    return {
      id: c.id,
      username: c.username,
      nome: c.nome,
      igsid: c.igsid,
      ultima: u ? (u.origem === "comentario" ? `💬 ${u.texto}` : u.texto) : null,
      origemUltima: u?.origem ?? null,
      em: u?.createdAt.toISOString() ?? null,
      pendente: Boolean(dela && (!c.lidoEm || c.lidoEm < u.createdAt)),
      atendimento: c.status === "atendimento",
      tags: c.tags,
    };
  });
}

export async function naoLidas() {
  const itens = await listarConversas();
  return itens.filter((i) => i.pendente).length;
}

export async function detalheConversa(id: string) {
  const c = await prisma.contact.findUnique({ where: { id }, include: { mensagens: { orderBy: { createdAt: "asc" }, take: 500 } } });
  if (!c) return null;
  const comentarios = await prisma.commentEvent.findMany({ where: { fromUserId: c.igsid }, select: { commentId: true } });
  const acoes = await prisma.activityLog.findMany({
    where: { commentId: { in: comentarios.map((x) => x.commentId) } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { flow: { select: { name: true } } },
  });
  const janelaAberta = Boolean(c.ultimaEntrada && Date.now() - c.ultimaEntrada.getTime() < JANELA_MS);
  return {
    contato: {
      id: c.id, igsid: c.igsid, username: c.username, nome: c.nome, email: c.email, telefone: c.telefone, notas: c.notas,
      tags: c.tags, status: c.status, etapa: c.etapa, desde: c.createdAt.toISOString(),
    },
    janelaAberta,
    janelaFecha: c.ultimaEntrada ? new Date(c.ultimaEntrada.getTime() + JANELA_MS).toISOString() : null,
    mensagens: c.mensagens.map((m) => ({ id: m.id, texto: m.texto, em: m.createdAt.toISOString(), direcao: m.direcao, origem: m.origem })),
    comentarios: comentarios.length,
    historico: acoes.map((a) => ({ quando: a.createdAt.toISOString(), tipo: a.type, fluxo: a.flow?.name ?? null })),
  };
}

/** Resposta digitada no painel. Só vale dentro da janela de 24 h. */
export async function enviarPeloPainel(id: string, texto: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const c = await prisma.contact.findUnique({ where: { id } });
  if (!c) return { ok: false, erro: "Conversa não encontrada." };
  if (!c.ultimaEntrada || Date.now() - c.ultimaEntrada.getTime() >= JANELA_MS) {
    return { ok: false, erro: "A Meta só deixa responder até 24 h depois da última mensagem da pessoa. Espere ela escrever de novo ou responda pelo app do Instagram." };
  }
  const creds = await getActiveCredentials();
  if (!creds.accessToken) return { ok: false, erro: "Conecte o Instagram em Configurações para responder por aqui." };
  const r = await sendDm(creds, { id: c.igsid }, texto);
  if (!r.ok) {
    const msg = (r.body as { error?: { message?: string } } | null)?.error?.message;
    return { ok: false, erro: `A Meta recusou a mensagem${msg ? `: ${msg}` : "."}` };
  }
  await registrarEnvio(r, c.igsid, texto, "humano");
  await prisma.contact.update({ where: { id }, data: { lidoEm: new Date() } });
  return { ok: true };
}
