import { asDmFlow } from "@/lib/flowTypes";
import { GATILHOS, tipoDe } from "@/lib/gatilhos";

// Descrição curta de uma automação, usada no servidor e no navegador (sem banco).

type FluxoBase = {
  scope: string;
  matchType: string;
  keywords: string[];
  publicReplies: string[];
  dmMessage: string | null;
  dmFlow: unknown;
  grafo?: unknown;
  tipo?: string;
};

/** "Palavras: quero, link · todos os posts · resposta pública + DM com botões" */
export function descreverFluxo(f: FluxoBase) {
  const t = tipoDe(f.tipo);
  const g = GATILHOS[t];
  const palavras = f.matchType === "KEYWORD" && g.palavras !== "nenhuma" ? `Palavras: ${f.keywords.join(", ") || "nenhuma"}` : null;
  const gatilho = t === "comentario" ? palavras ?? "Qualquer comentário" : [g.rotulo, palavras].filter(Boolean).join(" · ");
  const onde = t !== "comentario" ? "" : f.scope === "SPECIFIC_POST" ? "um post" : "todos os posts";
  const passos = (f.grafo as { nos?: unknown[] } | null | undefined)?.nos?.length;
  const acoes = [f.publicReplies.length ? "resposta pública" : "", passos ? `fluxo de ${passos} passo${passos === 1 ? "" : "s"}` : asDmFlow(f.dmFlow) ? "DM com botões" : f.dmMessage ? "DM" : ""]
    .filter(Boolean)
    .join(" + ");
  return [gatilho, onde, acoes || "sem ação"].filter(Boolean).join(" · ");
}
