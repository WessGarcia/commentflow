"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Instagram, Search, X, Trash2, Info } from "lucide-react";
import { fmt, corDe, iniciais } from "./fmt";

/**
 * As peças do painel (design herdado do painel antigo da Mandei, 19/09). Cada
 * tela monta a sua com isto, em vez de repetir estilo inline. Cores sempre por
 * variável (ver o bloco `.painel` em ../painel.css): nada de hex nas telas.
 *
 * Os avatares sao iniciais sobre pastel deterministico pelo nome, como no
 * handoff; a foto do Instagram entra quando a API der (fallback = iniciais).
 */


/** Cartao branco. */
export function Card({ children, className = "", style, pad = 20, id }: { children: ReactNode; className?: string; style?: CSSProperties; pad?: number; id?: string }) {
  return (
    <div id={id} className={`m-card ${className}`} style={{ padding: pad, ...style }}>
      {children}
    </div>
  );
}

const TONS = {
  roxo: { bg: "var(--m-tint)", fg: "var(--accent)" },
  verde: { bg: "var(--m-success-alt-bg)", fg: "var(--m-success-alt)" },
  azul: { bg: "var(--m-info-bg)", fg: "var(--m-info-text)" },
  vermelho: { bg: "var(--m-danger-bg)", fg: "var(--danger-text)" },
  rosa: { bg: "var(--m-pink-bg)", fg: "var(--m-pink-text)" },
  ambar: { bg: "var(--m-warning-bg)", fg: "var(--warning-text)" },
  cinza: { bg: "var(--m-neutral-bg)", fg: "var(--m-neutral-text)" },
  ig: { bg: "var(--m-grad-ig)", fg: "#fff" },
  marca: { bg: "var(--m-grad-brand)", fg: "#fff" },
} as const;
export type Tom = keyof typeof TONS;

/** Quadradinho com icone. */
export function Tile({ tom = "roxo", size = 40, radius, children, style }: { tom?: Tom; size?: number; radius?: number; children: ReactNode; style?: CSSProperties }) {
  const t = TONS[tom];
  return (
    <span
      className="flex items-center justify-center shrink-0"
      style={{ width: size, height: size, borderRadius: radius ?? Math.round(size * 0.3), background: t.bg, color: t.fg, ...style }}
    >
      {children}
    </span>
  );
}

/** Pilula de status ou categoria. `dot` poe a bolinha na frente. */
export function Pill({ tom = "cinza", dot, children, style }: { tom?: Tom; dot?: boolean; children: ReactNode; style?: CSSProperties }) {
  const cor =
    tom === "verde" ? { bg: "var(--m-success-bg)", fg: "var(--success-text)", dot: "var(--success)" }
    : tom === "ambar" ? { bg: "var(--m-warning-bg)", fg: "var(--warning-text)", dot: "var(--warning)" }
    : tom === "vermelho" ? { bg: "var(--m-danger-bg)", fg: "var(--danger-text)", dot: "var(--danger)" }
    : tom === "azul" ? { bg: "var(--m-info-bg)", fg: "var(--m-info-text)", dot: "var(--info)" }
    : tom === "rosa" ? { bg: "var(--m-pink-bg)", fg: "var(--m-pink-text)", dot: "var(--m-pink)" }
    : tom === "roxo" ? { bg: "var(--m-tint)", fg: "var(--accent)", dot: "var(--accent)" }
    : { bg: "var(--m-neutral-bg)", fg: "var(--m-neutral-text)", dot: "var(--m-text-dim)" };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full whitespace-nowrap" style={{ background: cor.bg, color: cor.fg, fontSize: 11.5, fontWeight: 700, padding: "3px 9px", ...style }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cor.dot }} />}
      {children}
    </span>
  );
}

export function Avatar({ nome, size = 40, foto, ig, style }: { nome: string; size?: number; foto?: string | null; ig?: boolean; style?: CSSProperties }) {
  const [bg, fg] = corDe(nome);
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size, ...style }}>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className="rounded-full object-cover w-full h-full" />
      ) : (
        <span className="rounded-full flex items-center justify-center w-full h-full" style={{ background: bg, color: fg, fontWeight: 700, fontSize: Math.round(size * 0.36) }}>
          {iniciais(nome)}
        </span>
      )}
      {ig && (
        <span className="absolute rounded-md flex items-center justify-center" style={{ width: 17, height: 17, right: -2, bottom: -2, background: "var(--m-grad-ig)", border: "2px solid var(--bg-card)", color: "#fff" }}>
          <Instagram size={9} />
        </span>
      )}
    </span>
  );
}

/** Cabecalho de pagina: H1 + subtitulo + acoes a direita. */
export function PageHeader({ titulo, sub, children }: { titulo: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-5 flex-wrap" style={{ paddingTop: 18, marginBottom: 22 }}>
      <div className="min-w-0">
        <h1 className="m-h1">{titulo}</h1>
        {sub && <p className="m-sub">{sub}</p>}
      </div>
      {children && <div className="flex items-center gap-10px shrink-0" style={{ gap: 10 }}>{children}</div>}
    </div>
  );
}

/** Variacao contra o periodo anterior: verde sobe, vermelho desce, cinza sem base. */
export function Delta({ atual, anterior, sufixo = "vs. período anterior" }: { atual: number; anterior: number; sufixo?: string }) {
  if (!anterior && !atual) return <span style={{ fontSize: 12.5, color: "var(--m-text-faint)" }}>sem dados ainda</span>;
  if (!anterior) return <span style={{ fontSize: 12.5, color: "var(--m-text-faint)" }}>novo neste período</span>;
  const d = Math.round(((atual - anterior) / anterior) * 100);
  const sobe = d >= 0;
  return (
    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12.5 }}>
      <span style={{ color: sobe ? "var(--success)" : "var(--danger-text)", fontWeight: 700 }}>{sobe ? "↑" : "↓"} {Math.abs(d)}%</span>
      <span className="m-delta-sufixo" style={{ color: "var(--m-text-faint)" }}>{sufixo}</span>
    </span>
  );
}

/**
 * Cartao de metrica, nas tres variantes do handoff:
 *   padrao      label esquerda + tile direita, numero grande, delta embaixo (Inicio)
 *   horizontal  tile esquerda, textos a direita (Contatos, Transmissao, Comentarios)
 *   compacta    tile + label na mesma linha, numero + delta embaixo (Palavras-chaves, Insights)
 */
export function Metrica({ rotulo, valor, icone, tom = "roxo", atual, anterior, sufixo, sub, variante = "padrao" }: {
  rotulo: string; valor: string; icone: ReactNode; tom?: Tom; atual?: number; anterior?: number; sufixo?: string; sub?: string; variante?: "padrao" | "horizontal" | "compacta";
}) {
  const delta = atual != null && anterior != null ? <Delta atual={atual} anterior={anterior} sufixo={sufixo} /> : null;
  if (variante === "horizontal") {
    return (
      <Card pad={18} className="flex items-center gap-3.5 m-metrica-h">
        <Tile tom={tom} size={40}>{icone}</Tile>
        <div className="min-w-0">
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-muted)" }}>{rotulo}</div>
          <div className="flex items-baseline gap-2.5 mt-0.5">
            <span style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-.025em" }}>{valor}</span>
            {delta}
          </div>
          {sub && <div style={{ fontSize: 12, color: "var(--m-text-faint)" }}>{sub}</div>}
        </div>
      </Card>
    );
  }
  if (variante === "compacta") {
    return (
      <Card pad={18}>
        <div className="flex items-center gap-2.5">
          <Tile tom={tom} size={40}>{icone}</Tile>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-muted)" }}>{rotulo}</span>
        </div>
        <div className="flex items-baseline gap-2.5" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 29, fontWeight: 800, letterSpacing: "-.025em" }}>{valor}</span>
          {delta}
        </div>
        {sub && <div style={{ fontSize: 12, color: "var(--m-text-faint)", marginTop: 2 }}>{sub}</div>}
      </Card>
    );
  }
  return (
    <Card style={{ padding: "20px 22px" }}>
      <div className="flex items-start justify-between gap-3">
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>{rotulo}</div>
        <Tile tom={tom} size={40}>{icone}</Tile>
      </div>
      <div style={{ fontSize: 31, fontWeight: 800, letterSpacing: "-.025em", marginTop: 12 }}>{valor}</div>
      <div style={{ marginTop: 8 }}>{delta ?? (sub && <span style={{ fontSize: 12.5, color: "var(--m-text-faint)" }}>{sub}</span>)}</div>
    </Card>
  );
}

/** Abas em chip (Inicio, Conversas). */
export function Abas({ itens, ativo, onChange }: { itens: { v: string; r: string; n?: number }[]; ativo: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {itens.map((t) => {
        const on = t.v === ativo;
        return (
          <button
            key={t.v}
            type="button"
            onClick={() => onChange(t.v)}
            className="inline-flex items-center gap-1.5 border-0 cursor-pointer"
            style={{ borderRadius: 10, padding: "7px 12px", fontSize: 13, fontWeight: on ? 700 : 600, background: on ? "var(--accent-dim)" : "transparent", color: on ? "var(--accent)" : "var(--text-muted)" }}
          >
            {t.r}
            {t.n ? (
              <span className="rounded-full" style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", background: on ? "var(--accent)" : "var(--m-neutral-bg)", color: on ? "#fff" : "var(--m-neutral-text)" }}>{t.n}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Abas sublinhadas (Comentarios, painel do contato). */
export function AbasLinha({ itens, ativo, onChange }: { itens: { v: string; r: string; n?: number }[]; ativo: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1" style={{ borderBottom: "1px solid var(--border-strong)", overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none" }}>
      {itens.map((t) => {
        const on = t.v === ativo;
        return (
          <button
            key={t.v}
            type="button"
            onClick={() => onChange(t.v)}
            className="border-0 bg-transparent cursor-pointer"
            style={{ whiteSpace: "nowrap", flex: "0 0 auto", padding: "10px 14px", fontSize: 13.5, fontWeight: 700, color: on ? "var(--accent)" : "var(--text-muted)", borderBottom: on ? "2.5px solid var(--accent)" : "2.5px solid transparent", marginBottom: -1 }}
          >
            {t.r}{t.n != null ? <span style={{ marginLeft: 6, color: on ? "var(--accent)" : "var(--m-text-faint)" }}>({fmt(t.n)})</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Campo de busca (dentro de card = fundo suave; na barra = branco). */
export function Busca({ placeholder, value, onChange, suave, altura = 40, style }: { placeholder: string; value?: string; onChange?: (v: string) => void; suave?: boolean; altura?: number; style?: CSSProperties }) {
  return (
    <label className="flex items-center gap-2.5" style={{ height: altura, padding: "0 12px", background: suave ? "var(--m-surface-subtle)" : "var(--bg-card)", border: `1px solid ${suave ? "var(--border)" : "var(--border-strong)"}`, borderRadius: altura >= 44 ? 11 : 10, ...style }}>
      <Search size={16} style={{ color: "var(--m-text-placeholder)", flex: "0 0 auto" }} />
      <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange?.(e.target.value)} className="flex-1 min-w-0 border-0 bg-transparent" style={{ fontSize: 13.5, outline: "none" }} />
    </label>
  );
}

/** Caixa de dica roxa. */
export function Dica({ titulo, children, href, link, onFechar, icone }: { titulo: string; children: ReactNode; href?: string; link?: string; onFechar?: () => void; icone: ReactNode }) {
  return (
    <div style={{ background: "var(--m-panel)", border: "1px solid var(--m-panel-border)", borderRadius: 16, padding: 18 }}>
      <div className="flex items-center gap-2.5">
        <span style={{ color: "var(--accent)", display: "flex" }}>{icone}</span>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--m-accent-deep)" }}>{titulo}</span>
        {onFechar && (
          <button type="button" onClick={onFechar} className="ml-auto border-0 bg-transparent cursor-pointer flex" style={{ color: "#9B8FBF" }} aria-label="fechar">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="m-pretty" style={{ fontSize: 13, color: "var(--m-panel-text)", lineHeight: 1.55, marginTop: 9 }}>{children}</div>
      {href && link && (
        <Link href={href} className="inline-flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 700, marginTop: 11 }}>
          {link} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

/** "Ver todas →" no canto do card. */
export function LinkSeta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="ml-auto inline-flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 700 }}>
      {children} <ArrowRight size={15} />
    </Link>
  );
}

export function Toggle({ on, onChange, lg, rotulo }: { on: boolean; onChange?: (v: boolean) => void; lg?: boolean; rotulo?: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={rotulo} className={`m-toggle${lg ? " lg" : ""}`} data-on={on ? "true" : "false"} onClick={() => onChange?.(!on)} />;
}

/** Rodape de tabela: "Mostrando X de Y" + paginas. */
export function Paginacao({ total, porPagina, pagina, onChange, rotulo }: { total: number; porPagina: number; pagina: number; onChange: (p: number) => void; rotulo: string }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const ini = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const fim = Math.min(total, pagina * porPagina);
  const lista: (number | "…")[] = [];
  for (let p = 1; p <= paginas; p++) {
    if (p <= 5 || p === paginas || Math.abs(p - pagina) <= 1) lista.push(p);
    else if (lista[lista.length - 1] !== "…") lista.push("…");
  }
  const btn: CSSProperties = { width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--bg-card)", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap" style={{ padding: "14px 20px", borderTop: "1px solid var(--m-divider)", fontSize: 13, color: "var(--m-text-dim)" }}>
      <span>Mostrando {total === 0 ? 0 : `${fmt(ini)}${fim !== ini ? `–${fmt(fim)}` : ""}`} de {fmt(total)} {rotulo}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" style={btn} disabled={pagina <= 1} onClick={() => onChange(pagina - 1)} aria-label="anterior"><ChevronLeft size={16} /></button>
        {lista.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} style={{ padding: "0 4px" }}>…</span>
          ) : (
            <button key={p} type="button" onClick={() => onChange(p)} style={{ ...btn, background: p === pagina ? "var(--accent)" : "var(--bg-card)", color: p === pagina ? "#fff" : "var(--text-secondary)", borderColor: p === pagina ? "var(--accent)" : "var(--border-strong)" }}>{p}</button>
          )
        )}
        <button type="button" style={btn} disabled={pagina >= paginas} onClick={() => onChange(pagina + 1)} aria-label="próxima"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

/** Estado vazio de lista, curto e honesto. */
export function Vazio({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p className="m-pretty" style={{ margin: 0, padding: "26px 8px", textAlign: "center", fontSize: 13, color: "var(--m-text-dim)", lineHeight: 1.55, ...style }}>{children}</p>;
}

// ------------------------------------------------------------------ confirmacao

export type PedidoConfirmacao = { titulo: string; texto?: ReactNode; confirmar?: string; cancelar?: string; perigo?: boolean };

/**
 * Pop-up de confirmacao do produto, no lugar do confirm() do navegador
 * (21/09). Uso:
 *   const [confirmar, modalConfirmar] = useConfirmar();
 *   if (!(await confirmar({ titulo: "Remover?", texto: "...", perigo: true }))) return;
 *   ... e {modalConfirmar} no JSX.
 */
export function useConfirmar(): [(p: PedidoConfirmacao) => Promise<boolean>, ReactNode] {
  const [pedido, setPedido] = useState<(PedidoConfirmacao & { resolver: (v: boolean) => void }) | null>(null);
  const confirmar = useCallback((p: PedidoConfirmacao) => new Promise<boolean>((resolver) => setPedido({ ...p, resolver })), []);
  const fechar = (v: boolean) => { pedido?.resolver(v); setPedido(null); };
  const elemento = pedido ? <ModalConfirmar {...pedido} onResposta={fechar} /> : null;
  return [confirmar, elemento];
}

export function ModalConfirmar({ titulo, texto, confirmar = "Confirmar", cancelar = "Cancelar", perigo, onResposta }: PedidoConfirmacao & { onResposta: (v: boolean) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onResposta(false); if (e.key === "Enter") onResposta(true); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onResposta]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "var(--m-scrim)", padding: 24 }} onClick={() => onResposta(false)}>
      <div role="alertdialog" aria-modal="true" aria-label={titulo} className="m-card" style={{ width: 440, maxWidth: "100%", padding: 24, borderRadius: 18 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start" style={{ gap: 14 }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 13, background: perigo ? "var(--m-danger-bg)" : "var(--m-tint)", color: perigo ? "var(--danger-text)" : "var(--accent)" }}>{perigo ? <Trash2 size={20} /> : <Info size={20} />}</span>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.25 }}>{titulo}</div>
            {texto && <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.55, marginTop: 8 }}>{texto}</div>}
          </div>
        </div>
        <div className="flex justify-end" style={{ gap: 8, marginTop: 22 }}>
          <button type="button" onClick={() => onResposta(false)} className="m-btn-2">{cancelar}</button>
          <button type="button" autoFocus onClick={() => onResposta(true)} className="cursor-pointer" style={{ border: 0, borderRadius: 12, padding: "11px 18px", fontSize: 14, fontWeight: 700, font: "inherit", background: perigo ? "var(--danger)" : "var(--accent)", color: "#fff" }}>{confirmar}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Celular? (21/09) Abaixo de 760 px a casca troca a sidebar pela barra de
 * baixo e Conversas mostra uma coluna por vez. useSyncExternalStore para
 * nao dar setState em effect; no servidor e false (desktop) e o cliente
 * corrige na hidratacao.
 */
const MQ_MOBILE = "(max-width: 760px)";
function assinarMobile(cb: () => void) {
  const mq = window.matchMedia(MQ_MOBILE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
export function useMobile(): boolean {
  return useSyncExternalStore(assinarMobile, () => window.matchMedia(MQ_MOBILE).matches, () => false);
}
