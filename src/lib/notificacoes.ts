import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Notificações do painel (o sino do topo, como na Mandei). Cada evento que
 * merece aviso vira UMA linha, gravada por quem viu acontecer:
 *
 *   mensagem    mensagem nova no direct              -> Ver conversa
 *   comentario  comentário respondido pela automação -> Ver comentário
 *   fluxo       automação criada                     -> Abrir automação
 *   reconexao   o acesso ao Instagram caiu           -> Conectar conta
 *
 * "chave" impede aviso repetido quando a Meta reentrega o mesmo evento.
 * Avisar nunca derruba quem avisou: erro aqui só vai para o log.
 */

export type TipoNotificacao = "mensagem" | "comentario" | "fluxo" | "reconexao" | "contato";
export type Etiqueta = "novo" | "concluido" | "atencao";

export type Notificacao = {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  destaque: string | null;
  texto: string;
  link: string | null;
  etiqueta: Etiqueta | null;
  lida: boolean;
  criada_em: string;
};

export async function notificar(n: { tipo: TipoNotificacao; titulo: string; texto: string; destaque?: string | null; link?: string | null; etiqueta?: Etiqueta | null; chave?: string | null }) {
  try {
    await prisma.notificacao.create({
      data: { tipo: n.tipo, titulo: n.titulo, texto: n.texto, destaque: n.destaque ?? null, link: n.link ?? null, etiqueta: n.etiqueta ?? null, chave: n.chave ?? null },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return; // já avisado
    console.error("notificar", e);
  }
}

/** O acesso caiu (senha trocada, app removido, token vencido): um aviso por dia, no máximo. */
export function avisarReconexao() {
  const dia = new Date().toISOString().slice(0, 10);
  return notificar({ tipo: "reconexao", titulo: "Reconecte o seu Instagram", texto: "A Meta recusou o acesso da conta. Enquanto não reconectar, as automações não respondem.", link: "/app/configuracoes", etiqueta: "atencao", chave: `reconexao:${dia}` });
}

export async function listarNotificacoes(porPagina = 20, pagina = 1) {
  const [linhas, total, naoLidas] = await Promise.all([
    prisma.notificacao.findMany({ orderBy: { createdAt: "desc" }, take: porPagina, skip: (pagina - 1) * porPagina }),
    prisma.notificacao.count(),
    prisma.notificacao.count({ where: { lida: false } }),
  ]);
  const itens: Notificacao[] = linhas.map((n) => ({
    id: n.id, tipo: n.tipo as TipoNotificacao, titulo: n.titulo, destaque: n.destaque, texto: n.texto, link: n.link,
    etiqueta: (n.etiqueta as Etiqueta | null) ?? null, lida: n.lida, criada_em: n.createdAt.toISOString(),
  }));
  return { itens, total, naoLidas };
}

export const contarNaoLidas = () => prisma.notificacao.count({ where: { lida: false } });

export async function marcarLidas(alvo: { id: string } | { todas: true }) {
  if ("todas" in alvo) await prisma.notificacao.updateMany({ where: { lida: false }, data: { lida: true } });
  else await prisma.notificacao.updateMany({ where: { id: alvo.id }, data: { lida: true } });
}
