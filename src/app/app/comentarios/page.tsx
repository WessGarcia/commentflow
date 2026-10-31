import Link from "next/link";
import { CheckCircle2, Clock, EyeOff, MessageSquare, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { listarComentarios, metricasComentarios } from "@/lib/comentarios";
import { contaConectada } from "@/lib/painel";
import { BancoFora } from "../_ui/banco-fora";
import { Metrica, PageHeader } from "../_ui/ui";
import { fmt } from "../_ui/fmt";
import { Moderacao } from "./lista";

export const dynamic = "force-dynamic";

/** Comentários: tudo que chegou, o que a automação fez e o que você faz na mão. ?q= busca, ?comentario= abre um. */
export default async function ComentariosPage({ searchParams }: { searchParams: Promise<{ q?: string; comentario?: string }> }) {
  const sp = await searchParams;
  const dados = await Promise.all([listarComentarios(), prisma.flow.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true } }), contaConectada()]).catch(() => null);
  if (!dados) return <BancoFora />;
  const [itens, flows, conta] = dados;
  const m = metricasComentarios(itens);

  return (
    <div className="rise-in">
      <PageHeader titulo="Comentários" sub="Todo comentário que chegou nos seus posts, com o que a automação fez com cada um.">
        <Link href="/app/palavras-chave" className="m-btn"><Plus size={17} /> Regras de resposta</Link>
      </PageHeader>
      <div className="grid m-metricas m-inicio-metricas" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 18, marginBottom: 20 }}>
        <Metrica variante="horizontal" rotulo="Comentários recebidos" valor={fmt(m.atual.recebidos)} icone={<MessageSquare size={20} strokeWidth={1.8} />} atual={m.atual.recebidos} anterior={m.anterior.recebidos} sufixo="vs. 7 dias antes" sub="nos últimos 7 dias" />
        <Metrica variante="horizontal" rotulo="Aguardando resposta" valor={fmt(m.aguardando)} icone={<Clock size={20} strokeWidth={1.8} />} tom="vermelho" sub="sem palavra-chave, ninguém respondeu" />
        <Metrica variante="horizontal" rotulo="Respondidos" valor={fmt(m.atual.respondidos)} icone={<CheckCircle2 size={20} strokeWidth={1.8} />} tom="verde" atual={m.atual.respondidos} anterior={m.anterior.respondidos} sufixo="vs. 7 dias antes" sub="nos últimos 7 dias" />
        <Metrica variante="horizontal" rotulo="Ocultados" valor={fmt(m.ocultados)} icone={<EyeOff size={20} strokeWidth={1.8} />} tom="vermelho" sub="comentários ocultos" />
      </div>
      <Moderacao inicial={itens} fluxos={flows.map((f) => ({ id: f.id, nome: f.name }))} conta={conta?.username ?? null} qInicial={sp.q ?? ""} abrir={sp.comentario} />
    </div>
  );
}
