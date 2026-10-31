"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Bell, CheckCheck, Instagram, List, MessageSquare, Users, Zap } from "lucide-react";
import type { Notificacao } from "@/lib/notificacoes";
import { IconeCabecalho, Painel } from "./painel-lateral";
import { grupoDe, quandoRelativo } from "./fmt";

/**
 * Notificações (o sino do topo, como na Mandei): gaveta com a lista agrupada
 * em Hoje / Esta semana / Antes. Clicar marca como lida e leva à tela do
 * evento. A contagem do sino vem do /api/painel/status que a casca já consulta.
 */

type Aparencia = { icone: ReactNode; bg: string; fg: string; borda?: string; acao: string };
const APARENCIA: Record<Notificacao["tipo"], Aparencia> = {
  mensagem: { icone: <Instagram size={22} />, bg: "var(--bg-card)", fg: "var(--m-ig-text)", borda: "var(--m-ig-border)", acao: "Ver conversa" },
  comentario: { icone: <MessageSquare size={21} strokeWidth={1.9} />, bg: "var(--m-indigo-bg)", fg: "var(--m-indigo-text)", acao: "Ver comentário" },
  fluxo: { icone: <Zap size={21} strokeWidth={1.9} />, bg: "var(--m-indigo-bg)", fg: "var(--m-indigo-text)", acao: "Abrir automação" },
  reconexao: { icone: <AlertTriangle size={21} strokeWidth={1.9} />, bg: "var(--m-danger-bg)", fg: "var(--danger-text)", acao: "Conectar conta" },
  contato: { icone: <Users size={21} strokeWidth={1.9} />, bg: "var(--m-indigo-bg)", fg: "var(--m-indigo-text)", acao: "Ver contato" },
};

const ETIQUETA = {
  novo: { r: "Novo", bg: "var(--m-label-bg)", fg: "var(--m-label-text)" },
  concluido: { r: "Concluído", bg: "var(--m-success-bg)", fg: "var(--success-text)" },
  atencao: { r: "Atenção", bg: "var(--m-warning-bg)", fg: "var(--warning-text)" },
} as const;

export function NotificacoesPainel({ onFechar, naoLidas, onLidas }: { onFechar: () => void; naoLidas: number; onLidas: () => void }) {
  const router = useRouter();
  const [itens, setItens] = useState<Notificacao[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let vivo = true;
    fetch("/api/notificacoes?porPagina=20", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivo && j) { setItens(j.itens); setTotal(j.total); } })
      .catch(() => { if (vivo) setItens([]); });
    return () => { vivo = false; };
  }, []);

  const abrir = (n: Notificacao) => {
    if (!n.lida) {
      setItens((l) => l?.map((x) => (x.id === n.id ? { ...x, lida: true } : x)) ?? null);
      fetch("/api/notificacoes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: n.id }) }).then(onLidas).catch(() => {});
    }
    if (n.link) { onFechar(); router.push(n.link); }
  };
  const lerTodas = async () => {
    setItens((l) => l?.map((x) => ({ ...x, lida: true })) ?? null);
    await fetch("/api/notificacoes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ todas: true }) }).catch(() => {});
    onLidas();
  };

  return (
    <Painel
      onFechar={onFechar}
      largura={600}
      rotulo="Notificações"
      cabecalho={
        <div className="flex items-start" style={{ gap: 14 }}>
          <IconeCabecalho><Bell size={23} strokeWidth={1.9} /></IconeCabecalho>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em" }}>Notificações</span>
              {naoLidas > 0 && <span className="flex items-center justify-center" style={{ background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 700, minWidth: 22, height: 22, borderRadius: 999, padding: "0 7px" }}>{naoLidas > 99 ? "99+" : naoLidas}</span>}
              {naoLidas > 0 && (
                <button type="button" onClick={lerTodas} className="ml-auto flex items-center border-0 bg-transparent cursor-pointer whitespace-nowrap" style={{ gap: 5, fontSize: 12.5, fontWeight: 700, color: "var(--accent)", font: "inherit", padding: "4px 0" }}><CheckCheck size={15} /> Marcar todas como lidas</button>
              )}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--m-text-dim)", marginTop: 2 }}>O que aconteceu na sua conta.</div>
          </div>
        </div>
      }
      rodape={
        <Link href="/app/notificacoes" onClick={onFechar} className="flex items-center justify-center w-full" style={{ gap: 10, borderRadius: 14, padding: "15px 0", background: "var(--m-tint)", color: "var(--m-accent-deep)", fontSize: 14, fontWeight: 700 }}>
          <List size={17} /> Ver todas as notificações{total > 20 ? ` (${total})` : ""} <ArrowRight size={16} />
        </Link>
      }
      corpoStyle={{ paddingTop: 4 }}
    >
      <ListaNotificacoes itens={itens} onAbrir={abrir} />
    </Painel>
  );
}

export function ListaNotificacoes({ itens, onAbrir }: { itens: Notificacao[] | null; onAbrir: (n: Notificacao) => void }) {
  if (itens === null) return <div style={{ padding: "30px 0", textAlign: "center", fontSize: 13, color: "var(--m-text-dim)" }}>Carregando…</div>;
  if (!itens.length) {
    return (
      <div className="flex flex-col items-center text-center" style={{ padding: "48px 20px" }}>
        <span className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 18, background: "var(--m-tint)", color: "var(--accent)" }}><Bell size={26} strokeWidth={1.8} /></span>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 14 }}>Nada por aqui ainda</div>
        <div style={{ fontSize: 13, color: "var(--m-text-dim)", lineHeight: 1.5, marginTop: 4, maxWidth: 320 }}>Mensagens novas, comentários respondidos, automações criadas e avisos da conta aparecem aqui.</div>
      </div>
    );
  }
  const grupos = new Map<string, Notificacao[]>();
  for (const n of itens) { const k = grupoDe(n.criada_em); grupos.set(k, [...(grupos.get(k) ?? []), n]); }
  return (
    <>
      {["Hoje", "Esta semana", "Antes"].filter((k) => grupos.has(k)).map((k) => (
        <div key={k} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: "-.02em", padding: "8px 0 10px" }}>{k}</div>
          <div className="flex flex-col" style={{ gap: 10 }}>
            {grupos.get(k)!.map((n) => <ItemNotificacao key={n.id} n={n} onAbrir={() => onAbrir(n)} />)}
          </div>
        </div>
      ))}
      <div style={{ height: 14 }} />
    </>
  );
}

function ItemNotificacao({ n, onAbrir }: { n: Notificacao; onAbrir: () => void }) {
  const a = APARENCIA[n.tipo] ?? APARENCIA.contato;
  const et = n.etiqueta ? ETIQUETA[n.etiqueta] : null;
  const destacada = !n.lida;
  return (
    <div
      role={n.link ? "link" : undefined}
      tabIndex={n.link ? 0 : undefined}
      onClick={onAbrir}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAbrir(); } }}
      className="flex items-start m-notif-item"
      style={{ gap: 13, border: `1px solid ${destacada ? "var(--m-unread-border)" : "var(--m-row-border)"}`, background: destacada ? "var(--m-unread-bg)" : "var(--bg-card)", borderRadius: 15, padding: 14, cursor: n.link ? "pointer" : "default" }}
    >
      <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 13, background: a.bg, color: a.fg, border: a.borda ? `1px solid ${a.borda}` : undefined }}>{a.icone}</span>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{n.titulo}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginTop: 4, wordBreak: "break-word" }}>
          {n.destaque && <span style={{ fontWeight: 700, color: "var(--m-neutral-text)" }}>{n.destaque}</span>}{n.destaque && n.texto ? " " : ""}{n.texto}
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 m-notif-lado" style={{ gap: 8 }}>
        <span style={{ fontSize: 11.5, color: "var(--m-text-faint)", fontWeight: 600 }}>{quandoRelativo(n.criada_em)}</span>
        {et && <span className="inline-flex" style={{ background: et.bg, color: et.fg, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 10px" }}>{et.r}</span>}
        {n.link && (
          <span className="flex items-center whitespace-nowrap" style={{ gap: 7, borderRadius: 11, padding: "9px 13px", fontSize: 12.5, fontWeight: 700, background: destacada ? "var(--m-label-bg)" : "var(--m-divider-soft)", color: destacada ? "var(--m-label-text)" : "var(--m-neutral-text)" }}>
            {a.acao} <ArrowRight size={14} />
          </span>
        )}
      </div>
    </div>
  );
}
