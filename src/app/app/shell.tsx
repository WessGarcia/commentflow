"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Home, Zap, Users, Key, MessageCircle, Settings,
  ChevronLeft, ChevronRight, ChevronDown, Search, HelpCircle, Instagram, ArrowLeft, MoreHorizontal, X,
} from "lucide-react";
import { Avatar } from "./_ui/ui";

/**
 * A casca do painel, no desenho do painel antigo da Mandei (19/09): sidebar
 * branca de 252 px que colapsa para 82, topbar de 74 px com busca e a conta, e
 * o conteúdo rolando dentro do <main>. No celular (até 760 px) a sidebar some:
 * barra de navegação embaixo e "Mais" abre o resto do menu.
 * O que a casca sabe da operação vem de /api/painel/status.
 */

const NAV = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/app/fluxos", label: "Automações", icon: Zap },
  { href: "/app/comentarios", label: "Comentários", icon: MessageCircle },
  { href: "/app/contatos", label: "Contatos", icon: Users },
  { href: "/app/palavras-chave", label: "Palavras-chaves", icon: Key },
  { href: "/app/configuracoes", label: "Configurações", icon: Settings },
] as const;

const GUIA_URL = "https://github.com/gabrieltabarkiewicz/commentflow/blob/main/docs/GUIA.md";

type Status = { conta: string | null; conectada: boolean; fluxosAtivos: number };

export function PainelShell({ fontes, children }: { fontes: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [st, setSt] = useState<Status | null>(null);
  const [colapsada, setColapsada] = useState(false);
  const [menuConta, setMenuConta] = useState(false);
  const [folhaMais, setFolhaMais] = useState(false);
  const [busca, setBusca] = useState("");
  const buscaRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/painel/status", { cache: "no-store" });
      setSt(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    try { setColapsada(localStorage.getItem("painel.sidebar") === "colapsada"); } catch {}
    carregar();
    const t = setInterval(carregar, 30_000);
    return () => clearInterval(t);
  }, [carregar]);

  // ⌘K / Ctrl+K foca a busca; Esc fecha o menu da conta e a folha "Mais".
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); buscaRef.current?.focus(); }
      if (e.key === "Escape") { setMenuConta(false); setFolhaMais(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const alternar = () => {
    const v = !colapsada;
    setColapsada(v);
    try { localStorage.setItem("painel.sidebar", v ? "colapsada" : "aberta"); } catch {}
  };

  const ativoDe = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const q = busca.trim();
    if (q) router.push(`/app/comentarios?q=${encodeURIComponent(q)}`);
  };

  const conta = st?.conta ? `@${st.conta.replace(/^@/, "")}` : null;

  return (
    <div className={`painel ${fontes} flex w-full`} style={{ height: "100dvh", overflow: "hidden" }}>
      <aside
        className="flex flex-col shrink-0 m-so-desktop"
        style={{ width: colapsada ? 82 : 252, transition: "width .18s ease", background: "var(--bg-card)", borderRight: "1px solid var(--border)", overflow: "hidden" }}
      >
        <div className="flex items-center gap-2.5" style={{ padding: colapsada ? "22px 0 18px" : "22px 18px 18px 20px", justifyContent: colapsada ? "center" : undefined }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/commentflow-logo.svg" alt="CommentFlow" width={40} height={40} className="shrink-0" style={{ display: "block" }} />
          {!colapsada && <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.03em" }}>CommentFlow</span>}
          {!colapsada && (
            <button type="button" onClick={alternar} aria-label="recolher menu" className="ml-auto flex items-center justify-center cursor-pointer shrink-0" style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--m-text-dim)" }}>
              <ChevronLeft size={14} />
            </button>
          )}
        </div>
        {colapsada && (
          <button type="button" onClick={alternar} aria-label="abrir menu" className="mx-auto mb-1 flex items-center justify-center cursor-pointer" style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--m-text-dim)" }}>
            <ChevronRight size={14} />
          </button>
        )}

        <nav className="flex flex-col min-h-0 overflow-y-auto" style={{ gap: 3, padding: "6px 12px" }}>
          {NAV.map((it) => {
            const ativo = ativoDe(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                title={colapsada ? it.label : undefined}
                className={`flex items-center select-none ${ativo ? "" : "m-nav"}`}
                style={{
                  gap: 13, padding: colapsada ? "11px 0" : "11px 14px", borderRadius: 12, justifyContent: colapsada ? "center" : undefined,
                  background: ativo ? "var(--accent-dim)" : "transparent", color: ativo ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                <it.icon size={20} strokeWidth={1.8} className="shrink-0" />
                {!colapsada && <span className="whitespace-nowrap" style={{ fontSize: 14.5, fontWeight: ativo ? 700 : 600 }}>{it.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {!colapsada && (
          <div style={{ margin: "0 14px 12px", border: "1px solid var(--m-plan-border)", background: "var(--m-plan-bg)", borderRadius: 16, padding: 16 }}>
            <div className="flex items-center gap-2">
              <Instagram size={17} style={{ color: st?.conectada ? "var(--success)" : "var(--m-text-dim)" }} strokeWidth={1.8} />
              <span className="truncate" style={{ fontSize: 14.5, fontWeight: 700 }}>{st?.conectada ? conta : "Instagram"}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--m-text-dim)", marginTop: 4 }}>
              {!st ? "…" : st.conectada ? `${st.fluxosAtivos} automaç${st.fluxosAtivos === 1 ? "ão ativa" : "ões ativas"}` : "Conta ainda não conectada"}
            </div>
            {st?.conectada ? (
              <Link href="/app/configuracoes" className="block text-center" style={{ marginTop: 12, borderRadius: 11, padding: "11px 0", background: "var(--accent)", color: "#fff", fontSize: 13.5, fontWeight: 700, boxShadow: "var(--glow-accent)" }}>
                Ver conexão
              </Link>
            ) : (
              <a href="/api/auth/meta/login" className="block text-center" style={{ marginTop: 12, borderRadius: 11, padding: "11px 0", background: "var(--accent)", color: "#fff", fontSize: 13.5, fontWeight: 700, boxShadow: "var(--glow-accent)" }}>
                Conectar Instagram
              </a>
            )}
          </div>
        )}

        {!colapsada && (
          <div style={{ padding: "4px 20px 22px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)" }}>CommentFlow</div>
            <div style={{ fontSize: 12.5, color: "var(--m-text-faint)", lineHeight: 1.45, marginTop: 2 }}>Sem mensalidade e sem cobrança por contato.</div>
          </div>
        )}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center shrink-0 m-topo" style={{ height: 74, gap: 20, padding: "0 30px", background: "var(--bg-primary)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/commentflow-logo.svg" alt="CommentFlow" width={34} height={34} className="shrink-0 m-so-mobile" style={{ display: "block" }} />
          <form onSubmit={buscar} className="flex items-center w-full m-topo-busca" style={{ maxWidth: 470, height: 44, gap: 10, padding: "0 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-card)" }}>
            <Search size={18} style={{ color: "var(--m-text-placeholder)", flex: "0 0 auto" }} />
            <input id="painel-busca" ref={buscaRef} type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar comentários..." className="flex-1 min-w-0 border-0 bg-transparent" style={{ fontSize: 14, outline: "none" }} />
            <span className="m-so-desktop" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--m-text-faint)", background: "var(--m-divider-soft)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 7px", whiteSpace: "nowrap" }}>⌘ K</span>
          </form>
          <div className="flex-1 m-so-desktop" />
          <a href={GUIA_URL} target="_blank" rel="noreferrer" aria-label="Guia passo a passo" title="Guia passo a passo" className="flex items-center justify-center m-so-desktop" style={{ width: 38, height: 38, borderRadius: "50%", color: "var(--m-text-dim)" }}>
            <HelpCircle size={21} strokeWidth={1.8} />
          </a>
          <div className="relative m-so-desktop">
            <button type="button" onClick={() => setMenuConta((v) => !v)} className="flex items-center cursor-pointer border-0 bg-transparent" style={{ gap: 11, paddingLeft: 16, marginLeft: 4, borderLeft: "1px solid var(--border-strong)" }}>
              <Avatar nome={st?.conta || "CommentFlow"} size={42} ig={Boolean(st?.conectada)} />
              <span className="flex flex-col text-left" style={{ lineHeight: 1.3 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700 }}>{conta ?? "Sua conta"}</span>
                <span style={{ fontSize: 12.5, color: "var(--m-text-dim)" }}>{st?.conectada ? "Instagram conectado" : "Instagram não conectado"}</span>
              </span>
              <ChevronDown size={17} style={{ color: "var(--m-text-dim)" }} />
            </button>
            {menuConta && (
              <div className="m-card absolute right-0 z-20 flex flex-col" style={{ top: 52, minWidth: 210, padding: 6 }} onMouseLeave={() => setMenuConta(false)}>
                <Link href="/app/configuracoes" onClick={() => setMenuConta(false)} className="flex items-center gap-2.5 rounded-lg" style={{ padding: "9px 11px", fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>
                  <Settings size={16} style={{ color: "var(--m-text-dim)" }} /> Configurações
                </Link>
                {/* link comum: recarrega a landing com os estilos dela */}
                <a href="/" className="flex items-center gap-2.5 rounded-lg" style={{ padding: "9px 11px", fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>
                  <ArrowLeft size={16} style={{ color: "var(--m-text-dim)" }} /> Voltar ao site
                </a>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-auto m-conteudo" style={{ padding: "4px 30px 30px" }}>
          <div style={{ minWidth: 0 }}>{children}</div>
        </main>
      </div>

      {/* celular: barra de baixo e a folha "Mais" */}
      <nav className="m-nav-baixo m-so-mobile" aria-label="menu">
        {NAV.slice(0, 4).map((it) => {
          const ativo = ativoDe(it.href) && !folhaMais;
          return (
            <Link key={it.href} href={it.href} onClick={() => setFolhaMais(false)} className={ativo ? "on" : ""}>
              <it.icon size={22} strokeWidth={ativo ? 2.2 : 1.8} />
              <span>{it.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setFolhaMais((v) => !v)} className={folhaMais || NAV.slice(4).some((it) => ativoDe(it.href)) ? "on" : ""} aria-expanded={folhaMais}>
          <MoreHorizontal size={22} strokeWidth={1.8} />
          <span>Mais</span>
        </button>
      </nav>
      {folhaMais && (
        <div className="fixed inset-0" style={{ zIndex: 35, background: "var(--m-scrim)" }} onClick={() => setFolhaMais(false)}>
          <div className="m-folha" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center" style={{ padding: "6px 8px 10px" }}>
              <Avatar nome={st?.conta || "CommentFlow"} size={40} />
              <span className="flex flex-col min-w-0" style={{ marginLeft: 10, lineHeight: 1.3 }}>
                <span className="truncate" style={{ fontSize: 14.5, fontWeight: 700 }}>{conta ?? "Sua conta"}</span>
                <span style={{ fontSize: 12.5, color: "var(--m-text-dim)" }}>{st?.conectada ? "Instagram conectado" : "Instagram não conectado"}</span>
              </span>
              <button type="button" onClick={() => setFolhaMais(false)} aria-label="fechar" className="ml-auto flex border-0 bg-transparent cursor-pointer" style={{ color: "var(--m-text-dim)" }}><X size={20} /></button>
            </div>
            {NAV.slice(4).map((it) => (
              <Link key={it.href} href={it.href} onClick={() => setFolhaMais(false)} className="flex items-center rounded-xl" style={{ gap: 12, padding: "12px 10px", fontSize: 15, fontWeight: 600, color: ativoDe(it.href) ? "var(--accent)" : "var(--text-primary)", background: ativoDe(it.href) ? "var(--accent-dim)" : "transparent" }}>
                <it.icon size={20} strokeWidth={1.8} /> {it.label}
              </Link>
            ))}
            <a href={GUIA_URL} target="_blank" rel="noreferrer" className="flex items-center rounded-xl" style={{ gap: 12, padding: "12px 10px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
              <HelpCircle size={20} strokeWidth={1.8} /> Guia passo a passo
            </a>
            <a href="/" className="flex items-center rounded-xl" style={{ gap: 12, padding: "12px 10px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
              <ArrowLeft size={20} strokeWidth={1.8} /> Voltar ao site
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
