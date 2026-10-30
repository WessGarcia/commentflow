import { asDmFlow } from "@/lib/flowTypes";

// Descrição curta de uma automação, usada no servidor e no navegador (sem banco).

type FluxoBase = {
  scope: string;
  matchType: string;
  keywords: string[];
  publicReplies: string[];
  dmMessage: string | null;
  dmFlow: unknown;
};

/** "Palavras: quero, link · todos os posts · resposta pública + DM com botões" */
export function descreverFluxo(f: FluxoBase) {
  const gatilho = f.matchType === "KEYWORD" ? `Palavras: ${f.keywords.join(", ") || "nenhuma"}` : "Qualquer comentário";
  const onde = f.scope === "SPECIFIC_POST" ? "um post" : "todos os posts";
  const acoes = [f.publicReplies.length ? "resposta pública" : "", asDmFlow(f.dmFlow) ? "DM com botões" : f.dmMessage ? "DM" : ""]
    .filter(Boolean)
    .join(" + ");
  return `${gatilho} · ${onde} · ${acoes || "sem ação"}`;
}
