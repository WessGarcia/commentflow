"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BarChart3, BookOpen, ChevronDown, ChevronLeft, ChevronRight, HelpCircle, Inbox, Instagram, Lightbulb, Play, Search, Tag, Zap } from "lucide-react";
import { FAQ, GUIA_URL, TOPICOS, buscarAjuda, topicoPorSlug, type Topico } from "@/lib/ajuda";
import { IconeCabecalho, Painel } from "./painel-lateral";

/**
 * Central de ajuda (o "?" do topo, como na Mandei): busca, tópicos, o vídeo
 * de instalação, dúvidas frequentes e o guia completo. O conteúdo vem de
 * src/lib/ajuda.ts; a página /app/ajuda usa as mesmas peças.
 */

const ICONES: Record<Topico["icone"], ReactNode> = {
  instagram: <Instagram size={22} />, zap: <Zap size={22} strokeWidth={1.9} />, tag: <Tag size={22} strokeWidth={1.9} />, inbox: <Inbox size={22} strokeWidth={1.9} />, chart: <BarChart3 size={22} strokeWidth={1.9} />,
};
const TONS: Record<Topico["tom"], { bg: string; fg: string }> = {
  ig: { bg: "var(--m-grad-ig)", fg: "#fff" },
  roxo: { bg: "var(--m-tint)", fg: "var(--accent)" },
  verde: { bg: "var(--m-success-alt-bg)", fg: "var(--m-success-alt)" },
  indigo: { bg: "var(--m-indigo-bg)", fg: "var(--m-indigo-text)" },
};

export function AjudaPainel({ onFechar }: { onFechar: () => void }) {
  const [q, setQ] = useState("");
  const [artigo, setArtigo] = useState<string | null>(null);
  const buscaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); buscaRef.current?.focus(); buscaRef.current?.select(); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  return (
    <Painel
      onFechar={onFechar}
      largura={680}
      rotulo="Central de ajuda"
      cabecalho={
        <div>
          <div className="flex items-start" style={{ gap: 14 }}>
            <IconeCabecalho><HelpCircle size={23} strokeWidth={1.9} /></IconeCabecalho>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em" }}>Central de ajuda</div>
              <div style={{ fontSize: 13.5, color: "var(--m-text-dim)", marginTop: 2 }}>Respostas rápidas para usar o CommentFlow</div>
            </div>
            <div className="shrink-0 text-right m-so-desktop" style={{ fontFamily: "var(--font-hand)", fontSize: 17, color: "var(--accent)", lineHeight: 1.25, paddingTop: 2 }}>Estamos aqui para<br />te ajudar! 💜</div>
          </div>
          <label className="flex items-center" style={{ gap: 11, height: 48, padding: "0 15px", marginTop: 16, background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 13 }}>
            <Search size={18} style={{ color: "var(--m-text-placeholder)" }} />
            <input ref={buscaRef} type="search" value={q} onChange={(e) => { setQ(e.target.value); setArtigo(null); }} placeholder="Buscar na ajuda..." aria-label="Buscar na ajuda" className="flex-1 min-w-0 border-0 bg-transparent" style={{ fontSize: 14, outline: "none" }} />
          </label>
        </div>
      }
      rodape={
        <a href={GUIA_URL} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full" style={{ gap: 10, borderRadius: 14, padding: "15px 0", background: "var(--m-tint)", color: "var(--m-accent-deep)", fontSize: 14, fontWeight: 700 }}>
          <BookOpen size={17} /> Abrir o guia passo a passo completo <ArrowRight size={16} />
        </a>
      }
      corpoStyle={{ paddingTop: 20 }}
    >
      <ConteudoAjuda q={q} artigo={artigo} setArtigo={setArtigo} onLink={onFechar} />
    </Painel>
  );
}

/** O miolo da ajuda: resultados da busca, um artigo aberto ou a capa. Usado na gaveta e na página. */
export function ConteudoAjuda({ q, artigo, setArtigo, onLink }: { q: string; artigo: string | null; setArtigo: (s: string | null) => void; onLink?: () => void }) {
  const [faqAberta, setFaqAberta] = useState(0);
  const resultados = useMemo(() => buscarAjuda(q), [q]);
  const topico = artigo ? topicoPorSlug(artigo) : null;

  if (q.trim()) {
    return (
      <div className="flex flex-col" style={{ gap: 10, paddingBottom: 18 }}>
        <div style={{ fontSize: 13, color: "var(--m-text-dim)" }}>{resultados.length ? `${resultados.length} resultado${resultados.length === 1 ? "" : "s"}` : "Nada encontrado. Tente outra palavra ou abra o guia completo."}</div>
        {resultados.map((r, i) => (
          <button key={i} type="button" onClick={() => (r.tipo === "artigo" ? setArtigo(r.slug) : setFaqAberta(FAQ.findIndex((f) => f.p === r.titulo)))} className="m-row text-left cursor-pointer" style={{ border: "1px solid var(--m-row-border)", borderRadius: 13, padding: "12px 14px", background: "var(--bg-card)", font: "inherit", color: "inherit" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.titulo}</div>
            <div style={{ fontSize: 12.5, color: "var(--m-text-dim)", marginTop: 3, lineHeight: 1.45 }}>{r.trecho}</div>
          </button>
        ))}
      </div>
    );
  }

  if (topico) {
    return (
      <div style={{ paddingBottom: 18 }}>
        <button type="button" onClick={() => setArtigo(null)} className="flex items-center border-0 bg-transparent cursor-pointer p-0" style={{ gap: 4, fontSize: 13, fontWeight: 700, color: "var(--accent)", font: "inherit" }}><ChevronLeft size={16} /> Voltar</button>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", marginTop: 12 }}>{topico.artigo.titulo}</div>
        <div style={{ fontSize: 14, color: "var(--m-text-body)", lineHeight: 1.6, marginTop: 6 }}>{topico.artigo.resumo}</div>
        <ol className="flex flex-col" style={{ gap: 10, marginTop: 16, paddingLeft: 0, listStyle: "none" }}>
          {topico.artigo.passos.map((p, i) => (
            <li key={i} className="flex items-start" style={{ gap: 11 }}>
              <span className="flex items-center justify-center shrink-0" style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--m-tint)", color: "var(--accent)", fontSize: 12, fontWeight: 800 }}>{i + 1}</span>
              <span style={{ fontSize: 13.5, lineHeight: 1.55 }}>{p}</span>
            </li>
          ))}
        </ol>
        {topico.artigo.dica && (
          <div className="flex items-start" style={{ gap: 9, marginTop: 16, padding: "11px 13px", borderRadius: 12, background: "var(--m-info-bg)", color: "var(--m-info-text)", fontSize: 12.5, lineHeight: 1.5 }}>
            <Lightbulb size={15} className="shrink-0" style={{ marginTop: 1 }} /> <span>{topico.artigo.dica}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>Tópicos</div>
      <div className="grid m-ajuda-topicos" style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 11, marginTop: 13 }}>
        {TOPICOS.map((t) => {
          const tom = TONS[t.tom];
          return (
            <button key={t.slug} type="button" onClick={() => setArtigo(t.slug)} className="block w-full m-row" style={{ border: "1px solid var(--m-row-border)", borderRadius: 15, padding: "14px 10px", textAlign: "center", background: "var(--bg-card)", color: "inherit", font: "inherit", cursor: "pointer" }}>
              <span className="flex items-center justify-center mx-auto" style={{ width: 44, height: 44, borderRadius: 13, background: tom.bg, color: tom.fg }}>{ICONES[t.icone]}</span>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, marginTop: 10 }}>{t.titulo}</div>
              <div style={{ fontSize: 11.5, color: "var(--m-text-dim)", lineHeight: 1.4, marginTop: 5 }}>{t.descricao}</div>
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em", marginTop: 24 }}>Vídeo de instalação</div>
      <Link href="/flow" target="_blank" onClick={onLink} className="flex items-center m-row" style={{ gap: 14, marginTop: 13, border: "1px solid var(--m-row-border)", borderRadius: 15, padding: 12, color: "inherit" }}>
        <span className="relative flex items-center justify-center shrink-0" style={{ width: 120, height: 68, borderRadius: 11, background: "var(--m-grad-cta)", color: "#fff" }}>
          <span className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.94)", color: "var(--accent)" }}><Play size={14} fill="currentColor" /></span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: 14, fontWeight: 700 }}>Seu CommentFlow no ar, do zero ao primeiro direct</span>
          <span className="block" style={{ fontSize: 12.5, color: "var(--m-text-dim)", marginTop: 3 }}>O passo a passo da instalação em vídeo.</span>
        </span>
        <ChevronRight size={18} style={{ color: "var(--m-text-placeholder)" }} />
      </Link>

      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em", marginTop: 24 }}>Dúvidas frequentes</div>
      <div className="flex flex-col" style={{ gap: 9, marginTop: 13, paddingBottom: 18 }}>
        {FAQ.map((f, i) => {
          const aberta = faqAberta === i;
          return (
            <div key={f.p} style={{ border: `1px solid ${aberta ? "var(--m-faq-open-border)" : "var(--border)"}`, background: aberta ? "var(--m-unread-bg)" : "var(--bg-card)", borderRadius: 13, padding: "14px 16px" }}>
              <button type="button" onClick={() => setFaqAberta(aberta ? -1 : i)} aria-expanded={aberta} className="flex items-center w-full border-0 bg-transparent cursor-pointer p-0 text-left" style={{ gap: 12, font: "inherit", color: "inherit" }}>
                <span className="flex-1 min-w-0" style={{ fontSize: 13.5, fontWeight: 600 }}>{f.p}</span>
                <ChevronDown size={17} className="shrink-0" style={{ color: "var(--m-text-dim)", transform: aberta ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
              </button>
              {aberta && <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 9 }}>{f.r}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
