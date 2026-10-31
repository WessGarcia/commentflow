"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Copy, GitBranch, MoreHorizontal, Pause, Pencil, Play, Trash2, Workflow } from "lucide-react";
import type { FlowDTO } from "@/lib/flowTypes";
import { descreverFluxo } from "@/lib/fluxoTexto";
import { linkDoFluxo } from "@/lib/modelos";
import { Busca, Card, Paginacao, Pill, Tile, Toggle, Vazio, useConfirmar } from "../_ui/ui";
import { fmt, quando } from "../_ui/fmt";

const POR_PAGINA = 10;

type Ordem = "ultimo" | "execucoes" | "nome";

/** A tabela de automações, com filtros no navegador (são poucas por conta). */
export function ListaFluxos({ iniciais, execucoes, ultimas }: { iniciais: FlowDTO[]; execucoes: Record<string, number>; ultimas: Record<string, string | null> }) {
  const router = useRouter();
  const [confirmar, modalConfirmar] = useConfirmar();
  const [fluxos, setFluxos] = useState(iniciais);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [onde, setOnde] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("ultimo");
  const [pagina, setPagina] = useState(1);
  const [menu, setMenu] = useState<string | null>(null);

  const lista = useMemo(() => {
    const termo = q.trim().toLowerCase();
    const l = fluxos.filter(
      (f) =>
        (!termo || (f.name + " " + f.keywords.join(" ")).toLowerCase().includes(termo)) &&
        (!status || (status === "ativo") === f.enabled) &&
        (!onde || f.scope === onde),
    );
    return [...l].sort((a, b) =>
      ordem === "nome" ? a.name.localeCompare(b.name) : ordem === "execucoes" ? (execucoes[b.id] ?? 0) - (execucoes[a.id] ?? 0) : (ultimas[b.id] ?? "").localeCompare(ultimas[a.id] ?? ""),
    );
  }, [fluxos, q, status, onde, ordem, execucoes, ultimas]);
  const pag = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const limpar = () => { setQ(""); setStatus(""); setOnde(""); setPagina(1); };

  async function alternar(f: FlowDTO) {
    const r = await fetch(`/api/flows/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !f.enabled }) });
    if (r.ok) setFluxos((prev) => prev.map((x) => (x.id === f.id ? { ...x, enabled: !f.enabled } : x)));
  }

  async function duplicar(f: FlowDTO) {
    setMenu(null);
    const { id: _id, ...resto } = f;
    const r = await fetch("/api/flows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...resto, name: `${f.name} (cópia)`, enabled: false }) });
    if (r.ok) router.refresh();
  }

  async function excluir(f: FlowDTO) {
    setMenu(null);
    const ok = await confirmar({ titulo: `Excluir “${f.name}”?`, texto: "A automação para de responder na hora. Isso não pode ser desfeito.", confirmar: "Excluir", perigo: true });
    if (!ok) return;
    const r = await fetch(`/api/flows/${f.id}`, { method: "DELETE" });
    if (r.ok) setFluxos((prev) => prev.filter((x) => x.id !== f.id));
  }

  const Ordena = ({ k, children }: { k: Ordem; children: React.ReactNode }) => (
    <button type="button" onClick={() => setOrdem(k)} className="inline-flex items-center gap-1 border-0 bg-transparent cursor-pointer p-0" style={{ font: "inherit", color: ordem === k ? "var(--accent)" : "inherit" }}>
      {children} <ArrowUpDown size={13} />
    </button>
  );

  return (
    <>
      {modalConfirmar}
      <div className="flex items-center m-filtros-fluxos" style={{ gap: 10, marginBottom: 18 }}>
        <Busca placeholder="Buscar automações..." value={q} onChange={(v) => { setQ(v); setPagina(1); }} altura={46} style={{ flex: 1 }} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPagina(1); }} className="m-select" style={{ height: 46 }} aria-label="status">
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
        </select>
        <select value={onde} onChange={(e) => { setOnde(e.target.value); setPagina(1); }} className="m-select" style={{ height: 46 }} aria-label="onde">
          <option value="">Todas as publicações</option>
          <option value="ALL_POSTS">Todos os posts</option>
          <option value="SPECIFIC_POST">Post específico</option>
        </select>
        <button type="button" onClick={limpar} className="border-0 bg-transparent cursor-pointer" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--accent)", padding: "0 6px", font: "inherit" }}>Limpar filtros</button>
      </div>

      <Card pad={0} style={{ overflow: "visible" }}>
        <div className="grid items-center m-tabela-fluxos" style={{ gap: 10, padding: "13px 20px", fontSize: 12.5, fontWeight: 700, color: "var(--m-text-dim)", borderBottom: "1px solid var(--m-divider)" }}>
          <div><Ordena k="nome">Automação</Ordena></div>
          <div>Status</div>
          <div className="m-col-larga m-col-media">Onde</div>
          <div className="m-col-larga"><Ordena k="execucoes">Execuções</Ordena></div>
          <div className="m-col-larga"><Ordena k="ultimo">Última execução</Ordena></div>
          <div className="m-col-larga m-col-media">Ligada</div>
          <div />
        </div>
        {pag.length === 0 && <Vazio>{fluxos.length ? "Nenhuma automação nesse filtro." : "Nenhuma automação ainda. Comece por um modelo aí em cima."}</Vazio>}
        {pag.map((f) => (
          <div key={f.id} className="m-row grid items-center m-tabela-fluxos" style={{ gap: 10, padding: "15px 20px", borderBottom: "1px solid var(--m-divider-soft)", fontSize: 13.5 }}>
            <Link href={linkDoFluxo(f)} className="flex items-center min-w-0" style={{ gap: 12, color: "inherit" }}>
              <Tile tom="roxo" size={36}><GitBranch size={17} strokeWidth={1.8} /></Tile>
              <div className="min-w-0">
                <div className="truncate" style={{ fontWeight: 700 }}>{f.name}</div>
                <div className="truncate" style={{ fontSize: 12.5, color: "var(--m-text-dim)", marginTop: 1 }}>{descreverFluxo(f)}</div>
              </div>
            </Link>
            <div><Pill tom={f.enabled ? "verde" : "ambar"} dot>{f.enabled ? "Ativo" : "Pausado"}</Pill></div>
            <div className="m-col-larga m-col-media"><Pill tom={f.scope === "SPECIFIC_POST" ? "rosa" : "roxo"}>{f.scope === "SPECIFIC_POST" ? "Post específico" : "Todos os posts"}</Pill></div>
            <div className="m-col-larga" style={{ fontWeight: 700 }}>{fmt(execucoes[f.id] ?? 0)}</div>
            <div className="m-col-larga" style={{ color: "var(--m-text-body)" }}>{ultimas[f.id] ? quando(ultimas[f.id]!) : "nunca rodou"}</div>
            <div className="m-col-larga m-col-media"><Toggle on={f.enabled} onChange={() => alternar(f)} rotulo={f.enabled ? "pausar" : "ativar"} /></div>
            <div className="relative flex justify-end">
              <button type="button" onClick={() => setMenu(menu === f.id ? null : f.id)} aria-label={`mais opções de ${f.name}`} className="border-0 bg-transparent cursor-pointer flex" style={{ color: "var(--m-text-placeholder)", padding: 4 }}><MoreHorizontal size={18} /></button>
              {menu === f.id && (
                <div className="m-card absolute right-0 z-20 flex flex-col" style={{ top: 28, minWidth: 200, padding: 6 }} onMouseLeave={() => setMenu(null)}>
                  <Link href={linkDoFluxo(f)} className="flex items-center rounded-lg m-nav" style={{ gap: 9, padding: "9px 11px", fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}><Pencil size={15} style={{ color: "var(--m-text-dim)" }} /> Editar</Link>
                  <Link href={`/app/automacao?avancado=1&editar=${f.id}`} className="flex items-center rounded-lg m-nav" style={{ gap: 9, padding: "9px 11px", fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}><Workflow size={15} style={{ color: "var(--m-text-dim)" }} /> Abrir no modo avançado</Link>
                  <button type="button" onClick={() => alternar(f)} className="flex items-center rounded-lg border-0 bg-transparent cursor-pointer text-left m-nav" style={{ gap: 9, padding: "9px 11px", fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", font: "inherit" }}>
                    {f.enabled ? <Pause size={15} style={{ color: "var(--m-text-dim)" }} /> : <Play size={15} style={{ color: "var(--m-text-dim)" }} />} {f.enabled ? "Pausar" : "Ativar"}
                  </button>
                  <button type="button" onClick={() => duplicar(f)} className="flex items-center rounded-lg border-0 bg-transparent cursor-pointer text-left m-nav" style={{ gap: 9, padding: "9px 11px", fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", font: "inherit" }}><Copy size={15} style={{ color: "var(--m-text-dim)" }} /> Duplicar</button>
                  <button type="button" onClick={() => excluir(f)} className="flex items-center rounded-lg border-0 bg-transparent cursor-pointer text-left m-nav" style={{ gap: 9, padding: "9px 11px", fontSize: 13.5, fontWeight: 600, color: "var(--danger-text)", font: "inherit" }}><Trash2 size={15} /> Excluir</button>
                </div>
              )}
            </div>
          </div>
        ))}
        <Paginacao total={lista.length} porPagina={POR_PAGINA} pagina={pagina} onChange={setPagina} rotulo={lista.length === 1 ? "automação" : "automações"} />
      </Card>
    </>
  );
}
