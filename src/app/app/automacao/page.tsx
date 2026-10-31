import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toFlowDTO } from "@/lib/flowTypes";
import { simplesDoFluxo, simplesDoModelo, simplesEmBranco } from "@/lib/modelos";
import { contaConectada } from "@/lib/painel";
import { BancoFora } from "../_ui/banco-fora";
import { EditorAvancado } from "./avancado";
import { AutomacaoSimples } from "./simples";

export const dynamic = "force-dynamic";

/**
 * Automação em dois modos (como na Mandei):
 *
 *   sem avancado   o formulário de três passos, por onde todo mundo começa.
 *                  ?modelo=id abre um modelo; ?editar=id abre uma salva.
 *   ?avancado=1    a conversa com vários passos e botões (?editar=id).
 *
 * Os dois salvam a MESMA automação; trocar de modo é trocar a URL. Uma
 * conversa que não cabe nos três passos sempre abre no avançado.
 */
export default async function AutomacaoPage({ searchParams }: { searchParams: Promise<{ modelo?: string; editar?: string; avancado?: string }> }) {
  const sp = await searchParams;
  const dados = await Promise.all([
    sp.editar ? prisma.flow.findUnique({ where: { id: sp.editar } }) : Promise.resolve(null),
    contaConectada(),
  ]).catch(() => null);
  if (!dados) return <BancoFora />;
  const [registro, conta] = dados;
  if (sp.editar && !registro) notFound();
  const fluxo = registro ? toFlowDTO(registro) : null;

  const simples = fluxo ? simplesDoFluxo(fluxo) : sp.modelo ? simplesDoModelo(sp.modelo) ?? simplesEmBranco() : simplesEmBranco();
  if (sp.avancado === "1" || !simples) return <EditorAvancado fluxo={fluxo} />;

  return <AutomacaoSimples key={fluxo?.id ?? sp.modelo ?? "novo"} inicial={simples} id={fluxo?.id ?? null} usuario={conta?.username ?? null} />;
}
