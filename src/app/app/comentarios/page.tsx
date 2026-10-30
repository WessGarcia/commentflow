import { getComentarios } from "@/lib/painel";
import { BancoFora } from "../_ui/banco-fora";
import { PageHeader } from "../_ui/ui";
import { ListaComentarios } from "./lista";

export const dynamic = "force-dynamic";

export default async function ComentariosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const itens = await getComentarios().catch(() => null);
  if (!itens) return <BancoFora />;
  return (
    <div className="rise-in">
      <PageHeader titulo="Comentários" sub="Tudo que chegou nos seus posts e o que a automação fez com cada comentário." />
      <ListaComentarios itens={itens} qInicial={sp.q ?? ""} />
    </div>
  );
}
