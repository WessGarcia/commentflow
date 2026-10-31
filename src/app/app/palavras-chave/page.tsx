import Link from "next/link";
import { GitBranch, Key, MessageCircle, Plus } from "lucide-react";
import { getPalavras } from "@/lib/painel";
import { BancoFora } from "../_ui/banco-fora";
import { Card, Metrica, PageHeader, Pill, Tile, Vazio } from "../_ui/ui";
import { fmt } from "../_ui/fmt";

export const dynamic = "force-dynamic";

/** As palavras que disparam automação, de onde vêm e quanto apareceram nos últimos 30 dias. */
export default async function PalavrasPage() {
  const dados = await getPalavras().catch(() => null);
  if (!dados) return <BancoFora />;
  const { linhas, comentarios30 } = dados;
  const ativas = linhas.filter((l) => l.ativo).length;
  const comPalavra = linhas.reduce((a, l) => a + l.usos, 0);

  return (
    <div className="rise-in">
      <PageHeader titulo="Palavras-chaves" sub="As palavras que, comentadas, disparam a resposta e o direct.">
        <Link href="/app/fluxos?modelos=1" className="m-btn"><Plus size={17} /> Nova automação</Link>
      </PageHeader>

      <div className="grid m-metricas" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 18, marginBottom: 20 }}>
        <Metrica variante="compacta" rotulo="Palavras ativas" valor={fmt(ativas)} icone={<Key size={20} strokeWidth={1.8} />} />
        <Metrica variante="compacta" tom="verde" rotulo="Usos nos últimos 30 dias" valor={fmt(comPalavra)} icone={<MessageCircle size={20} strokeWidth={1.8} />} sub="comentários com alguma palavra" />
        <Metrica variante="compacta" tom="azul" rotulo="Comentários em 30 dias" valor={fmt(comentarios30)} icone={<MessageCircle size={20} strokeWidth={1.8} />} />
      </div>

      <Card pad={0} className="overflow-hidden">
        {linhas.length === 0 && <Vazio>Nenhuma palavra-chave ainda. Crie uma automação do tipo “Comentar a palavra-chave”.</Vazio>}
        {linhas.map((l, i) => (
          <Link key={`${l.fluxoId}-${l.palavra}`} href={`/app/fluxos?editar=${l.fluxoId}`} className="m-row flex items-center flex-wrap" style={{ gap: 13, padding: "14px 18px", borderTop: i ? "1px solid var(--m-divider-soft)" : "none", color: "inherit" }}>
            <Tile tom="roxo" size={40}><Key size={18} strokeWidth={1.8} /></Tile>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, background: "var(--accent-dim)", color: "var(--accent)", borderRadius: 8, padding: "4px 10px" }}>{l.palavra}</span>
            <div className="flex-1 min-w-0 flex items-center" style={{ gap: 7, fontSize: 13, color: "var(--m-text-dim)", minWidth: 160 }}>
              <GitBranch size={14} /> <span className="truncate" style={{ fontWeight: 700, color: "var(--m-neutral-text)" }}>{l.fluxo}</span> · {l.escopo}
            </div>
            <span style={{ fontSize: 12.5, color: "var(--m-text-dim)" }}><b style={{ color: "var(--m-neutral-text)" }}>{fmt(l.usos)}</b> usos em 30 dias</span>
            <Pill tom={l.ativo ? "verde" : "ambar"} dot>{l.ativo ? "Ativa" : "Pausada"}</Pill>
          </Link>
        ))}
      </Card>
    </div>
  );
}
