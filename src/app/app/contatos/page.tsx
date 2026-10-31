import Link from "next/link";
import { Download, Headphones, KanbanSquare, List, Tag, UserPlus, Users } from "lucide-react";
import { listarContatos } from "@/lib/contatos";
import { BancoFora } from "../_ui/banco-fora";
import { Metrica, PageHeader } from "../_ui/ui";
import { fmt } from "../_ui/fmt";
import { ListaContatos } from "./lista";
import { Quadro } from "./quadro";

export const dynamic = "force-dynamic";

/**
 * Contatos (como na Mandei): todo mundo que comentou ou mandou direct, em
 * lista (com a ficha de cada um) ou em quadro. Não tem "adicionar contato"
 * na mão: contato nasce de comentário ou direct, que é o que dá o ID da Meta.
 * Exportar (CSV) leva a base para onde você quiser: ela é sua.
 */
export default async function ContatosPage({ searchParams }: { searchParams: Promise<{ v?: string; contato?: string }> }) {
  const sp = await searchParams;
  const contatos = await listarContatos().catch(() => null);
  if (!contatos) return <BancoFora />;
  const emQuadro = sp.v === "quadro";

  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const mesPassado = new Date(inicioMes); mesPassado.setMonth(mesPassado.getMonth() - 1);
  const em = (t: string) => Date.parse(t);
  const novosMes = contatos.filter((c) => em(c.desde) >= inicioMes.getTime()).length;
  const novosMesPassado = contatos.filter((c) => em(c.desde) >= mesPassado.getTime() && em(c.desde) < inicioMes.getTime()).length;
  const comTags = contatos.filter((c) => c.tags.length > 0).length;
  const atendimento = contatos.filter((c) => c.status === "atendimento").length;

  return (
    <div className="rise-in">
      <PageHeader titulo="Contatos" sub="Quem comentou ou mandou direct. Sem cobrança por contato: a base é sua.">
        <a href="/api/contatos/exportar" className="m-btn-2"><Download size={16} /> Exportar CSV</a>
      </PageHeader>

      <div className="grid m-metricas m-inicio-metricas" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 18, marginBottom: 18 }}>
        <Metrica variante="horizontal" rotulo="Total de contatos" valor={fmt(contatos.length)} icone={<Users size={20} strokeWidth={1.8} />} sub="sem limite" />
        <Metrica variante="horizontal" rotulo="Novos este mês" valor={fmt(novosMes)} icone={<UserPlus size={20} strokeWidth={1.8} />} tom="verde" atual={novosMes} anterior={novosMesPassado} sufixo="vs. mês passado" />
        <Metrica variante="horizontal" rotulo="Com etiquetas" valor={fmt(comTags)} icone={<Tag size={20} strokeWidth={1.8} />} sub={contatos.length ? `${Math.round((comTags / contatos.length) * 100)}% da base` : undefined} />
        <Metrica variante="horizontal" rotulo="Em atendimento" valor={fmt(atendimento)} icone={<Headphones size={20} strokeWidth={1.8} />} tom="azul" sub="esperando resposta sua" />
      </div>

      <div className="flex items-center" style={{ gap: 2, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 3, marginBottom: 16, width: "fit-content" }}>
        <Aba href="/app/contatos" on={!emQuadro} icone={<List size={15} />}>Lista</Aba>
        <Aba href="/app/contatos?v=quadro" on={emQuadro} icone={<KanbanSquare size={15} />}>Quadro</Aba>
      </div>

      {emQuadro ? <Quadro inicial={contatos} /> : <ListaContatos contatos={contatos} inicial={sp.contato} />}
    </div>
  );
}

/** Lista | Quadro: link de verdade, o modo fica na URL e sobrevive a um F5. */
function Aba({ href, on, icone, children }: { href: string; on: boolean; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center" style={{ gap: 7, padding: "7px 13px", borderRadius: 9, fontSize: 13, fontWeight: 700, background: on ? "var(--accent-dim)" : "transparent", color: on ? "var(--accent)" : "var(--text-muted)" }}>
      {icone}{children}
    </Link>
  );
}
