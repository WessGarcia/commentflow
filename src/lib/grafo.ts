import { z } from "zod";
import type { DmFlow } from "@/lib/flowTypes";

/**
 * O fluxo do construtor visual (como na Mandei): um GRAFO de passos que
 * começa quando alguém comenta a palavra-chave.
 *
 *   mensagem      texto, imagem, botões (link ou "vai para o passo X") e
 *                 respostas rápidas. A primeira mensagem sai como resposta
 *                 privada ao comentário; as seguintes, como direct normal
 *   atraso        espera N minutos e segue
 *   condicao      respondeu? clicou no link? tem a etiqueta? Ramos sim/não
 *   randomizador  sorteia um ramo pelo peso (teste A/B)
 *   acao          põe ou tira uma etiqueta do contato
 *   coleta        pergunta e guarda a resposta (e-mail, telefone ou texto)
 *
 * Cada passo aponta para o próximo pelo id. Sem próximo, o fluxo termina
 * ali (ou espera um toque, se a mensagem tem botão ou resposta rápida).
 * Módulo puro: a tela e o motor usam o mesmo esquema.
 */

const Id = z.string().min(1).max(40);
const Proximo = z.string().max(40).nullable().default(null);
const Pos = z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 });

export const BotaoSchema = z.object({
  titulo: z.string().trim().min(1).max(20),
  tipo: z.enum(["url", "proximo"]).default("proximo"),
  url: z.string().max(2000).default(""),
  proximo: Proximo,
});
export const RespostaRapidaSchema = z.object({ titulo: z.string().trim().min(1).max(20), proximo: Proximo });

const NoMensagem = z.object({
  id: Id, tipo: z.literal("mensagem"), pos: Pos,
  texto: z.string().max(1000).default(""),
  imagem_url: z.string().max(2000).default(""),
  botoes: z.array(BotaoSchema).max(3).default([]),
  respostas_rapidas: z.array(RespostaRapidaSchema).max(13).default([]),
  proximo: Proximo,
});
const NoAtraso = z.object({ id: Id, tipo: z.literal("atraso"), pos: Pos, minutos: z.number().int().min(1).max(60 * 24 * 14), proximo: Proximo });
const NoCondicao = z.object({ id: Id, tipo: z.literal("condicao"), pos: Pos, teste: z.enum(["respondeu", "clicou", "tem_tag"]), tag: z.string().max(40).default(""), sim: Proximo, nao: Proximo });
const NoRandomizador = z.object({
  id: Id, tipo: z.literal("randomizador"), pos: Pos,
  ramos: z.array(z.object({ rotulo: z.string().max(30).default(""), peso: z.number().int().min(1).max(100), proximo: Proximo })).min(2).max(5),
});
const NoAcao = z.object({ id: Id, tipo: z.literal("acao"), pos: Pos, acao: z.enum(["adicionar_tag", "remover_tag"]), tag: z.string().trim().min(1).max(40), proximo: Proximo });
const NoColeta = z.object({
  id: Id, tipo: z.literal("coleta"), pos: Pos, campo: z.enum(["email", "telefone", "texto"]),
  pergunta: z.string().trim().min(1).max(1000), erro: z.string().max(300).default("Não entendi. Pode mandar de novo?"), proximo: Proximo,
});

export const NoSchema = z.discriminatedUnion("tipo", [NoMensagem, NoAtraso, NoCondicao, NoRandomizador, NoAcao, NoColeta]);
export const GrafoSchema = z.object({ inicio: Id, nos: z.array(NoSchema).min(1).max(60) });

export type No = z.infer<typeof NoSchema>;
export type NoDe<T extends No["tipo"]> = Extract<No, { tipo: T }>;
export type Grafo = z.infer<typeof GrafoSchema>;
export type Botao = z.infer<typeof BotaoSchema>;

/** As saídas de um passo: o rótulo de cada ligação e para onde ela vai. */
export function saidasDoNo(n: No): { rotulo: string; alvo: string | null }[] {
  switch (n.tipo) {
    case "mensagem":
      return [
        ...n.respostas_rapidas.map((r, i) => ({ rotulo: `rapida:${i}`, alvo: r.proximo })),
        ...n.botoes.flatMap((b, i) => (b.tipo === "proximo" ? [{ rotulo: `botao:${i}`, alvo: b.proximo }] : [])),
        { rotulo: "proximo", alvo: n.proximo },
      ];
    case "condicao":
      return [{ rotulo: "sim", alvo: n.sim }, { rotulo: "nao", alvo: n.nao }];
    case "randomizador":
      return n.ramos.map((r, i) => ({ rotulo: `ramo:${i}`, alvo: r.proximo }));
    default:
      return [{ rotulo: "proximo", alvo: n.proximo }];
  }
}

/** Liga (ou desliga, com alvo null) uma saída de um passo. Devolve um passo novo. */
export function ligarSaida(n: No, rotulo: string, alvo: string | null): No {
  const c = structuredClone(n);
  const [tipo, i] = rotulo.split(":");
  const idx = Number(i);
  if (c.tipo === "mensagem" && tipo === "rapida") c.respostas_rapidas[idx].proximo = alvo;
  else if (c.tipo === "mensagem" && tipo === "botao") c.botoes[idx].proximo = alvo;
  else if (c.tipo === "condicao" && (tipo === "sim" || tipo === "nao")) c[tipo] = alvo;
  else if (c.tipo === "randomizador" && tipo === "ramo") c.ramos[idx].proximo = alvo;
  else if (tipo === "proximo" && "proximo" in c) c.proximo = alvo;
  return c;
}

/** Erros que impedem salvar: início que não existe, ligação para passo apagado, mensagem vazia. */
export function validarGrafo(g: Grafo, respostaPrivada = true): string[] {
  const ids = new Set(g.nos.map((n) => n.id));
  const erros: string[] = [];
  if (ids.size !== g.nos.length) erros.push("Há dois passos com o mesmo id.");
  if (!ids.has(g.inicio)) erros.push("O fluxo precisa de um primeiro passo.");
  for (const n of g.nos) {
    for (const s of saidasDoNo(n)) if (s.alvo && !ids.has(s.alvo)) erros.push(`Um passo aponta para um passo que não existe mais.`);
    if (n.tipo === "mensagem" && !n.texto.trim() && !n.imagem_url.trim()) erros.push("Toda mensagem precisa de texto ou imagem.");
    if (n.tipo === "mensagem") for (const b of n.botoes) if (b.tipo === "url" && !/^https?:\/\//i.test(b.url.trim())) erros.push(`O botão “${b.titulo}” precisa de um link começando com https://.`);
  }
  for (const n of g.nos) {
    if (n.tipo === "mensagem" && n.botoes.length && n.respostas_rapidas.length) erros.push("Uma mensagem usa botões ou respostas rápidas, não os dois.");
  }
  const primeiro = g.nos.find((n) => n.id === g.inicio);
  if (primeiro?.tipo !== "mensagem") erros.push("O primeiro passo precisa ser uma mensagem (é ela que responde o comentário).");
  else if (respostaPrivada) {
    // a resposta privada ao comentário é UM envio só (regra da Meta)
    if (primeiro.botoes.length && primeiro.imagem_url.trim() && primeiro.texto.trim().length > 80) erros.push("No primeiro passo, com imagem e botões, o texto tem até 80 caracteres (vira o título do cartão).");
    if (primeiro.botoes.length && primeiro.texto.trim().length > 640) erros.push("No primeiro passo, com botões, o texto tem até 640 caracteres.");
    if (primeiro.imagem_url.trim() && !primeiro.botoes.length) erros.push("No primeiro passo, imagem só junto de botões. Coloque a imagem num passo depois do toque.");
  }
  return Array.from(new Set(erros));
}

let seq = 0;
export const novoId = (tipo: string) => `${tipo.slice(0, 3)}${Date.now().toString(36).slice(-4)}${(seq++).toString(36)}`;

export function novoNo(tipo: No["tipo"], pos: { x: number; y: number }): No {
  const id = novoId(tipo);
  switch (tipo) {
    case "mensagem": return { id, tipo, pos, texto: "", imagem_url: "", botoes: [], respostas_rapidas: [], proximo: null };
    case "atraso": return { id, tipo, pos, minutos: 60, proximo: null };
    case "condicao": return { id, tipo, pos, teste: "clicou", tag: "", sim: null, nao: null };
    case "randomizador": return { id, tipo, pos, ramos: [{ rotulo: "A", peso: 50, proximo: null }, { rotulo: "B", peso: 50, proximo: null }] };
    case "acao": return { id, tipo, pos, acao: "adicionar_tag", tag: "interessado", proximo: null };
    case "coleta": return { id, tipo, pos, campo: "email", pergunta: "Qual o seu melhor e-mail?", erro: "Não entendi. Pode mandar de novo?", proximo: null };
  }
}

/** Uma automação antiga (direct simples ou conversa com botões) vira grafo para abrir no construtor. */
export function grafoDeAntigo(f: { dmMessage: string | null; dmFlow: DmFlow | null }): Grafo {
  if (f.dmFlow) {
    const ids = [f.dmFlow.entry, ...Object.keys(f.dmFlow.steps).filter((k) => k !== f.dmFlow!.entry)];
    const nos: No[] = ids.filter((id) => f.dmFlow!.steps[id]).map((id, i) => ({
      id, tipo: "mensagem", pos: { x: i * 300, y: 0 }, texto: f.dmFlow!.steps[id].text, imagem_url: "", botoes: [],
      respostas_rapidas: (f.dmFlow!.steps[id].quickReplies ?? []).map((q) => ({ titulo: q.title, proximo: q.next })), proximo: null,
    }));
    return { inicio: f.dmFlow.entry, nos };
  }
  return { inicio: "inicio", nos: [{ id: "inicio", tipo: "mensagem", pos: { x: 0, y: 0 }, texto: f.dmMessage ?? "", imagem_url: "", botoes: [], respostas_rapidas: [], proximo: null }] };
}

export function asGrafo(v: unknown): Grafo | null {
  const p = GrafoSchema.safeParse(v);
  return p.success ? p.data : null;
}

export function minutosLegivel(m: number) {
  if (m % 1440 === 0) return `${m / 1440} dia${m === 1440 ? "" : "s"}`;
  if (m % 60 === 0) return `${m / 60} h`;
  return `${m} min`;
}
