/**
 * As colunas do quadro de Contatos (como na Mandei). Módulo PURO: a tela e o
 * servidor leem as mesmas colunas.
 *
 * As primeiras colunas são DERIVADAS do que a pessoa fez de verdade
 * (comentou, recebeu o direct, respondeu, clicou no link): ninguém precisa arrastar, o
 * contato anda sozinho. As duas últimas são DECISÃO SUA (virou cliente, não
 * rolou), porque o CommentFlow vê mensagem, não vê venda.
 */
export type EtapaId = "comentou" | "recebeu" | "respondeu" | "clicou" | "cliente" | "perdeu";

export type Coluna = { id: EtapaId; nome: string; dica: string; derivada: boolean; tom: "roxo" | "azul" | "verde" | "ambar" | "cinza" };

export const COLUNAS: Coluna[] = [
  { id: "comentou", nome: "Comentou", dica: "Comentou num post, mas ainda não recebeu direct.", derivada: true, tom: "cinza" },
  { id: "recebeu", nome: "Recebeu o direct", dica: "A automação entregou e a pessoa ainda não respondeu.", derivada: true, tom: "cinza" },
  { id: "respondeu", nome: "Respondeu", dica: "Escreveu de volta ou tocou num botão. É conversa de verdade.", derivada: true, tom: "azul" },
  { id: "clicou", nome: "Clicou no link", dica: "Abriu o link que você mandou. É o mais quente que dá para medir.", derivada: true, tom: "roxo" },
  { id: "cliente", nome: "Virou cliente", dica: "Você marca: o CommentFlow não vê venda.", derivada: false, tom: "verde" },
  { id: "perdeu", nome: "Não rolou", dica: "Também é informação: mostra onde a conversa morre.", derivada: false, tom: "ambar" },
];

export const ETAPAS = COLUNAS.map((c) => c.id);
export const ehEtapa = (v: unknown): v is EtapaId => typeof v === "string" && (ETAPAS as string[]).includes(v);
const colunaDe = (id: EtapaId) => COLUNAS.find((c) => c.id === id)!;

/** Onde o contato cai sozinho. Clicar vence responder, que vence receber, que vence só comentar. */
export function etapaDerivada(c: { recebeu: boolean; respondeu: boolean; clicou?: boolean }): EtapaId {
  if (c.clicou) return "clicou";
  if (c.respondeu) return "respondeu";
  if (c.recebeu) return "recebeu";
  return "comentou";
}

/**
 * A etapa que vale. O que você arrastou vence o automático, menos quando foi
 * para uma coluna automática e a pessoa já passou dali sozinha: o quadro não
 * segura o cartão atrás do que aconteceu.
 */
export function etapaDoContato(c: { recebeu: boolean; respondeu: boolean; clicou?: boolean; etapa: string | null }): EtapaId {
  const auto = etapaDerivada(c);
  if (!ehEtapa(c.etapa)) return auto;
  if (!colunaDe(c.etapa).derivada) return c.etapa;
  return ETAPAS.indexOf(auto) > ETAPAS.indexOf(c.etapa) ? auto : c.etapa;
}
