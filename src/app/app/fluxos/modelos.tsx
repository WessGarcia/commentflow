"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight, Filter, Flame, Gift, Hash, Heart, LayoutGrid, ListChecks, MousePointerClick, Plus, Search, Send, ShoppingBag, Sparkles,
  Tag, Users, Video, X, Zap,
} from "lucide-react";
import { MODELOS, OBJETIVOS, linkDoModelo, type Modelo, type Objetivo } from "@/lib/modelos";
import { Card } from "../_ui/ui";

/**
 * O pop-up "Modelos" (como na Mandei): abre em "+ Nova automação". À esquerda
 * filtra por objetivo; à direita, busca, Recomendados e "Descubra mais".
 * Cada cartão abre o editor de três passos já preenchido; "Começar do zero"
 * abre o editor vazio.
 */

const ICONE_MODELO: Record<string, ReactNode> = {
  "link-por-dm": <Send size={22} strokeWidth={1.8} />, "material-gratis": <Gift size={22} strokeWidth={1.8} />, "preco-no-direct": <Tag size={22} strokeWidth={1.8} />,
  "palavra-chave": <Hash size={22} strokeWidth={1.8} />, cupom: <ShoppingBag size={22} strokeWidth={1.8} />, "lista-de-espera": <ListChecks size={22} strokeWidth={1.8} />,
  "link-da-aula": <Video size={22} strokeWidth={1.8} />, sorteio: <Sparkles size={22} strokeWidth={1.8} />, "agradecer-comentarios": <Heart size={22} strokeWidth={1.8} />,
};
const ICONE_OBJETIVO: Record<Objetivo, ReactNode> = {
  seguidores: <Users size={17} strokeWidth={1.8} />, engajar: <Heart size={17} strokeWidth={1.8} />, trafego: <MousePointerClick size={17} strokeWidth={1.8} />, vender: <ShoppingBag size={17} strokeWidth={1.8} />,
};

const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** "+ Nova automação": abre o pop-up. ?modelos=1 na URL já abre aberto. */
export function BotaoNovaAutomacao({ abrirDeInicio }: { abrirDeInicio?: boolean }) {
  const [aberto, setAberto] = useState(!!abrirDeInicio);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="m-btn"><Plus size={17} /> Nova automação</button>
      {aberto && <ModalModelos onFechar={() => setAberto(false)} />}
    </>
  );
}

/** O cartão "Modelos para você": os recomendados, e "Ver todos" abre o pop-up. */
export function ModelosCard() {
  const [aberto, setAberto] = useState(false);
  const recomendados = MODELOS.filter((m) => m.recomendado).slice(0, 3);
  return (
    <Card style={{ marginBottom: 18 }}>
      <div className="flex items-center">
        <button type="button" onClick={() => setAberto(true)} className="ml-auto flex items-center border-0 bg-transparent cursor-pointer" style={{ gap: 5, fontSize: 13, fontWeight: 700, color: "var(--accent)", font: "inherit", padding: 0 }}>Ver todos os modelos <ArrowRight size={14} /></button>
      </div>
      <div className="grid m-modelos-card" style={{ gridTemplateColumns: "minmax(190px,.9fr) repeat(3, minmax(0,1fr))", gap: 14, marginTop: 6 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>Modelos para você</div>
          <div className="m-pretty" style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginTop: 6 }}>Comece por um pronto, troque a palavra e o link, salve. Leva um minuto.</div>
          <button type="button" onClick={() => setAberto(true)} className="m-btn-2" style={{ marginTop: 14, padding: "9px 14px", fontSize: 13 }}>{MODELOS.length} modelos</button>
        </div>
        {recomendados.map((m) => <CardModelo key={m.id} m={m} />)}
      </div>
      {aberto && <ModalModelos onFechar={() => setAberto(false)} />}
    </Card>
  );
}

function ModalModelos({ onFechar }: { onFechar: () => void }) {
  const [q, setQ] = useState("");
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const buscaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    buscaRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    document.addEventListener("keydown", h);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = overflow; };
  }, [onFechar]);

  const filtrados = useMemo(() => {
    const termo = normalizar(q.trim());
    return MODELOS.filter((m) => (!objetivo || m.objetivo === objetivo) && (!termo || normalizar(m.nome + " " + m.descricao).includes(termo)));
  }, [q, objetivo]);
  const filtrando = !!objetivo || !!q.trim();
  const recomendados = filtrados.filter((m) => m.recomendado);
  const resto = filtrando ? filtrados : filtrados.filter((m) => !m.recomendado);
  const tituloFiltro = objetivo ? OBJETIVOS.find((o) => o.id === objetivo)!.rotulo : q.trim() ? `Resultados para “${q.trim()}”` : "Descubra mais modelos";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--m-scrim)", padding: 16 }} onClick={onFechar}>
      <div role="dialog" aria-modal="true" aria-label="Modelos" className="m-card m-modelos-dialogo flex flex-col" style={{ width: 1160, maxWidth: "100%", height: "min(850px, 100%)", borderRadius: 22, boxShadow: "var(--m-shadow-panel)", overflow: "hidden", padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start shrink-0 m-modelos-topo" style={{ gap: 16, padding: "26px 28px 18px" }}>
          <div className="flex-1 min-w-0">
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.03em" }}>Modelos</h2>
            <div style={{ fontSize: 13.5, color: "var(--m-text-dim)", marginTop: 2 }}>Escolha um modelo pronto ou comece do zero e crie sua automação em minutos.</div>
          </div>
          <Link href="/app/automacao" className="m-btn" style={{ padding: "12px 22px" }}><Plus size={17} /> Começar do zero</Link>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex items-center justify-center cursor-pointer shrink-0" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--m-text-dim)" }}><X size={18} /></button>
        </div>

        <div className="flex flex-1 min-h-0">
          <aside className="shrink-0 flex flex-col overflow-y-auto m-modelos-aside" style={{ width: 236, padding: "0 12px 16px 20px", borderRight: "1px solid var(--m-divider)" }}>
            <ItemNav ativo={!objetivo} onClick={() => setObjetivo(null)} icone={<LayoutGrid size={17} strokeWidth={1.8} />} badge={MODELOS.length}>Todos os modelos</ItemNav>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--m-text-dim)", margin: "18px 0 6px 8px" }}>Por objetivo</div>
            {OBJETIVOS.map((o) => <ItemNav key={o.id} ativo={objetivo === o.id} onClick={() => setObjetivo(o.id)} icone={ICONE_OBJETIVO[o.id]}>{o.rotulo}</ItemNav>)}
            <div className="flex items-start" style={{ gap: 10, marginTop: "auto", background: "var(--m-tint)", borderRadius: 14, padding: 14 }}>
              <Filter size={16} style={{ color: "var(--accent)", flex: "0 0 auto", marginTop: 2 }} />
              <span style={{ fontSize: 12, color: "var(--m-text-body)", lineHeight: 1.5 }}>Todos os modelos funcionam com <b>comentário no post ou reel</b>.</span>
            </div>
          </aside>

          <div className="flex-1 min-w-0 overflow-y-auto m-modelos-corpo" style={{ padding: "0 28px 24px 24px" }}>
            <label className="flex items-center" style={{ gap: 12, height: 50, padding: "0 18px", border: "1px solid var(--border)", borderRadius: 13, background: "var(--bg-card)" }}>
              <Search size={19} style={{ color: "var(--m-text-placeholder)" }} />
              <input ref={buscaRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelos do Instagram..." aria-label="Buscar modelos" className="flex-1 min-w-0 border-0 bg-transparent" style={{ fontSize: 14.5, outline: "none" }} />
            </label>

            {!filtrando && recomendados.length > 0 && (
              <>
                <Titulo texto="Recomendados" sub="Os modelos que mais entregam resultado para quem está começando." />
                <div className="grid m-modelos-grade" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14, marginTop: 14 }}>
                  {recomendados.map((m) => <CardModelo key={m.id} m={m} grande />)}
                </div>
              </>
            )}

            <Titulo texto={tituloFiltro} sub={filtrando ? `${resto.length} ${resto.length === 1 ? "modelo" : "modelos"}` : "Mais formas de engajar e vender pelos comentários."} />
            {resto.length ? (
              <div className="grid m-modelos-grade" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginTop: 14 }}>
                {resto.map((m) => <CardModelo key={m.id} m={m} />)}
              </div>
            ) : (
              <div className="text-center" style={{ padding: "40px 20px", fontSize: 13.5, color: "var(--m-text-dim)" }}>Nenhum modelo com esse filtro. <Link href="/app/automacao" style={{ fontWeight: 700 }}>Comece do zero</Link> e monte a sua.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemNav({ ativo, onClick, icone, badge, children }: { ativo: boolean; onClick: () => void; icone: ReactNode; badge?: number; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center w-full cursor-pointer text-left" style={{ gap: 11, padding: "10px 10px", borderRadius: 11, border: 0, background: ativo ? "var(--accent-dim)" : "transparent", color: ativo ? "var(--accent)" : "var(--text-secondary)", font: "inherit", fontSize: 13.5, fontWeight: ativo ? 700 : 600 }}>
      <span className="flex shrink-0" style={{ color: ativo ? "var(--accent)" : "var(--m-text-dim)" }}>{icone}</span>
      <span className="flex-1 min-w-0 truncate">{children}</span>
      {badge != null && <span style={{ background: ativo ? "var(--m-label-bg)" : "var(--m-neutral-bg)", color: ativo ? "var(--m-label-text)" : "var(--m-neutral-text)", fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: "2px 8px" }}>{badge}</span>}
    </button>
  );
}

function Titulo({ texto, sub }: { texto: string; sub: string }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.025em" }}>{texto}</div>
      <div style={{ fontSize: 13, color: "var(--m-text-dim)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

const SELO = {
  popular: { r: "Popular", bg: "var(--m-pink-bg)", fg: "var(--m-pink-text)", icone: <Flame size={12} /> },
  novo: { r: "Novo", bg: "var(--m-info-bg)", fg: "var(--m-info-text)", icone: <Sparkles size={12} /> },
} as const;

function CardModelo({ m, grande }: { m: Modelo; grande?: boolean }) {
  const selo = m.selo ? SELO[m.selo] : null;
  return (
    <Link href={linkDoModelo(m.id)} className="m-row relative flex flex-col overflow-hidden" style={{ border: "1px solid var(--m-row-border)", borderRadius: 16, padding: grande ? 18 : 16, background: "var(--bg-card)", color: "inherit", minHeight: grande ? 196 : 176 }}>
      <span aria-hidden="true" className="absolute" style={{ right: -40, bottom: -50, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(closest-side, var(--m-pink-bg), transparent 72%)", opacity: 0.9, pointerEvents: "none" }} />
      <div className="flex items-start">
        <span className="flex items-center justify-center shrink-0" style={{ width: grande ? 50 : 44, height: grande ? 50 : 44, borderRadius: 13, background: "var(--m-tint)", color: "var(--accent)" }}>{ICONE_MODELO[m.id] ?? <Zap size={22} />}</span>
        {selo && <span className="ml-auto inline-flex items-center" style={{ gap: 5, background: selo.bg, color: selo.fg, fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: "5px 11px" }}>{selo.icone}{selo.r}</span>}
      </div>
      <div style={{ fontSize: grande ? 16.5 : 15, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.25, marginTop: 14 }}>{m.nome}</div>
      <div className="m-pretty" style={{ fontSize: grande ? 13.5 : 12.5, color: "var(--m-text-dim)", lineHeight: 1.5, marginTop: 6 }}>{m.descricao}</div>
      <div className="flex items-center" style={{ gap: 7, marginTop: "auto", paddingTop: 14, fontSize: 12.5, fontWeight: 600, color: "var(--m-text-body)" }}>
        <Zap size={14} style={{ color: "var(--accent)" }} /> Automação rápida
      </div>
    </Link>
  );
}
