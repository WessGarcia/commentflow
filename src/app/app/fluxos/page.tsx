import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { toFlowDTO } from "@/lib/flowTypes";
import { getExecucoesPorFluxo, getUltimaPorFluxo } from "@/lib/painel";
import { BancoFora } from "../_ui/banco-fora";
import { PageHeader } from "../_ui/ui";
import { linkDoFluxo } from "@/lib/modelos";
import { ListaFluxos } from "./lista";
import { BotaoNovaAutomacao, ModelosCard } from "./modelos";

export const dynamic = "force-dynamic";

/**
 * Automações (como na Mandei): os modelos para começar, a tabela das
 * automações e o "+ Nova automação" que abre o pop-up de modelos
 * (?modelos=1 abre já aberto). ?novo=1 e ?editar= são os links antigos.
 */
export default async function FluxosPage({ searchParams }: { searchParams: Promise<{ modelos?: string; novo?: string; editar?: string }> }) {
  const sp = await searchParams;
  const dados = await Promise.all([prisma.flow.findMany({ orderBy: { createdAt: "desc" } }), getExecucoesPorFluxo(), getUltimaPorFluxo()]).catch(() => null);
  if (!dados) return <BancoFora />;
  const [flows, execucoes, ultimas] = dados;
  const dtos = flows.map(toFlowDTO);

  if (sp.editar) {
    const f = dtos.find((x) => x.id === sp.editar);
    if (f) redirect(linkDoFluxo(f));
  }

  return (
    <div className="rise-in">
      <PageHeader titulo="Automações" sub="Comentou a palavra-chave, recebeu a resposta e o direct.">
        <BotaoNovaAutomacao abrirDeInicio={sp.modelos === "1" || sp.novo === "1"} />
      </PageHeader>
      <ModelosCard />
      <ListaFluxos iniciais={dtos} execucoes={execucoes} ultimas={ultimas} />
    </div>
  );
}
