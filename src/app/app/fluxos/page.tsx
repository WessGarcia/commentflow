import { prisma } from "@/lib/db";
import { asDmFlow } from "@/lib/flowTypes";
import { getExecucoesPorFluxo } from "@/lib/painel";
import { BancoFora } from "../_ui/banco-fora";
import { Automacoes, type FlowDTO } from "./automacoes";

export const dynamic = "force-dynamic";

export default async function FluxosPage({ searchParams }: { searchParams: Promise<{ novo?: string; editar?: string }> }) {
  const sp = await searchParams;
  const dados = await Promise.all([prisma.flow.findMany({ orderBy: { createdAt: "desc" } }), getExecucoesPorFluxo()]).catch(() => null);
  if (!dados) return <BancoFora />;
  const [flows, execucoes] = dados;
  const dtos: FlowDTO[] = flows.map((f) => ({
    id: f.id,
    name: f.name,
    enabled: f.enabled,
    scope: f.scope,
    mediaId: f.mediaId,
    matchType: f.matchType,
    keywords: f.keywords,
    publicReplies: f.publicReplies,
    dmMessage: f.dmMessage,
    dmFlow: asDmFlow(f.dmFlow),
  }));
  return <Automacoes initialFlows={dtos} execucoes={execucoes} abrirNovo={sp.novo === "1"} editarId={sp.editar ?? null} />;
}
