"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Ban, Calendar, CheckCircle2, ChevronLeft, Clock, ExternalLink, GitBranch, Info, Loader2, Mail, MessageSquare, Pencil, Phone, Plus,
  Send, UserCheck, X, Zap,
} from "lucide-react";
import { Abas, Avatar, Busca, Card, Pill, Vazio, useConfirmar, useMobile } from "../_ui/ui";
import { quando, quandoCurto } from "../_ui/fmt";

/**
 * Conversas (como na Mandei): três cartões lado a lado, lista / conversa /
 * detalhes do contato, cada um com rolagem própria. No celular é UMA coluna
 * por vez: lista → conversa (com voltar) → detalhes (o "i" no cabeçalho).
 *
 * "Não lida" = a última mensagem é da pessoa e ninguém abriu depois. "Em
 * atendimento" = você marcou que está cuidando. Responder daqui só funciona
 * dentro das 24 h depois da última mensagem da pessoa (regra da Meta).
 */

type Item = { id: string; username: string | null; nome: string | null; igsid: string; ultima: string | null; em: string | null; pendente: boolean; atendimento: boolean; tags: string[] };
type Detalhe = {
  contato: { id: string; igsid: string; username: string | null; nome: string | null; email: string | null; telefone: string | null; notas: string | null; tags: string[]; status: string; desde: string };
  janelaAberta: boolean;
  janelaFecha: string | null;
  mensagens: { id: string; texto: string; em: string; direcao: string; origem: string }[];
  comentarios: number;
  historico: { quando: string; tipo: string; fluxo: string | null }[];
};

// Três colunas só cabem a partir de 1280 px; abaixo disso, detalhes abrem pelo "i".
const MQ_LARGO = "(min-width: 1280px)";
const assinarLargo = (cb: () => void) => { const m = window.matchMedia(MQ_LARGO); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const useLargo = () => useSyncExternalStore(assinarLargo, () => window.matchMedia(MQ_LARGO).matches, () => true);

const RAPIDAS = ["Te mandei o link aqui 👆", "Posso te ajudar em mais alguma coisa?", "Qualquer dúvida é só chamar 💜"];

const nomeDe = (i: { nome: string | null; username: string | null; igsid: string }) => i.nome || (i.username ? `@${i.username}` : `Contato ${i.igsid.slice(-4)}`);
const diaDe = (t: string) => new Date(t).toLocaleDateString("pt-BR");
const horaDe = (t: string) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const ROTULO_ACAO: Record<string, string> = {
  public_reply: "Respondeu o comentário", public_reply_error: "Erro ao responder o comentário",
  dm: "Mandou o direct", dm_error: "Erro ao mandar o direct", dm_flow: "Começou a conversa com botões", dm_flow_error: "Erro ao começar a conversa",
  dm_step: "Mandou o próximo passo", dm_step_error: "Erro no próximo passo", no_credentials: "Sem Instagram conectado",
};

export function Conversas({ inicial }: { inicial?: string }) {
  const [aba, setAba] = useState("todas");
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<Item[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(inicial || null);
  const [det, setDet] = useState<Detalhe | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novaTag, setNovaTag] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const mobile = useMobile();
  const largo = useLargo() && !mobile;
  const [vista, setVista] = useState<"lista" | "conversa" | "detalhes">(inicial ? "conversa" : "lista");
  const [confirmar, modalConfirmar] = useConfirmar();

  const carregarLista = useCallback(async () => {
    const r = await fetch("/api/conversas", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    setItens(r?.itens ?? []);
  }, []);

  const carregarDetalhe = useCallback(async (id: string) => {
    const r = await fetch(`/api/conversas/${id}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (r?.contato) setDet(r);
  }, []);

  useEffect(() => {
    carregarLista();
    const t = setInterval(carregarLista, 15_000);
    return () => clearInterval(t);
  }, [carregarLista]);

  // abrir = marcar como lida
  useEffect(() => {
    if (!aberto) return;
    setDet(null);
    carregarDetalhe(aberto);
    fetch(`/api/conversas/${aberto}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao: "lida" }) }).then(carregarLista);
    const t = setInterval(() => carregarDetalhe(aberto), 10_000);
    return () => clearInterval(t);
  }, [aberto, carregarDetalhe, carregarLista]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [det?.mensagens.length, aberto]);

  // No computador, abre a primeira: tela vazia não ajuda ninguém.
  useEffect(() => {
    if (!mobile && !aberto && itens?.length) setAberto(itens[0].id);
  }, [itens, aberto, mobile]);

  const termo = busca.trim().toLowerCase();
  const todas = itens ?? [];
  const naoLidas = todas.filter((i) => i.pendente).length;
  const lista = todas.filter(
    (i) =>
      (aba === "nao_lidas" ? i.pendente : aba === "atendimento" ? i.atendimento : aba === "resolvidas" ? !i.pendente && !i.atendimento : true) &&
      (!termo || `${i.nome ?? ""} ${i.username ?? ""} ${i.ultima ?? ""}`.toLowerCase().includes(termo)),
  );

  async function acao(corpo: Record<string, unknown>) {
    if (!aberto) return null;
    setErro(null);
    const r = await fetch(`/api/conversas/${aberto}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErro(j.error || "Não deu certo. Tente de novo."); return null; }
    return j;
  }
  async function enviar() {
    const msg = texto.trim();
    if (!msg || enviando) return;
    setEnviando(true);
    const r = await acao({ acao: "enviar", texto: msg });
    setEnviando(false);
    if (r) { setTexto(""); await carregarDetalhe(aberto!); carregarLista(); }
  }
  async function tag(t: string, remover = false) {
    if (await acao({ acao: "tag", tag: t, remover })) { setNovaTag(null); await carregarDetalhe(aberto!); carregarLista(); }
  }
  async function status(v: "atendimento" | "resolvida") {
    if (await acao({ acao: "status", status: v })) { await carregarDetalhe(aberto!); carregarLista(); }
  }
  async function bloquear() {
    const ok = await confirmar({ titulo: "Bloquear este contato?", texto: "Ele some das listas e a automação nunca mais responde os comentários e directs dele.", confirmar: "Bloquear", perigo: true });
    if (!ok) return;
    if (await acao({ acao: "bloquear" })) { setAberto(null); setDet(null); setVista("lista"); carregarLista(); }
  }

  const c = det?.contato;
  const altura = mobile ? { height: "calc(100dvh - 160px)" } : { height: "calc(100vh - 108px)", minHeight: 560 };
  const colunas = mobile ? "minmax(0,1fr)" : largo ? "340px minmax(0,1fr) 320px" : "300px minmax(0,1fr)";
  const verConversa = largo || (mobile ? vista === "conversa" : vista !== "detalhes");
  const verDetalhes = largo || vista === "detalhes";

  return (
    <div className="grid rise-in" style={{ ...altura, marginTop: 14, gridTemplateColumns: colunas, gap: mobile ? 0 : 18 }}>
      {modalConfirmar}

      {/* ---------- lista ---------- */}
      {(!mobile || vista === "lista") && (
        <Card pad={0} className="flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
          <div style={{ padding: "18px 18px 0" }}>
            <div className="flex items-center gap-2.5">
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Conversas</h1>
              {naoLidas > 0 && <span className="rounded-full" style={{ background: "var(--danger)", color: "#fff", fontSize: 11.5, fontWeight: 700, padding: "3px 9px" }}>{naoLidas} não lida{naoLidas === 1 ? "" : "s"}</span>}
              <a href="https://www.instagram.com/direct/inbox/" target="_blank" rel="noreferrer" title="Nova conversa (abre o Instagram)" className="ml-auto flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 11, background: "var(--accent)", color: "#fff", boxShadow: "var(--glow-accent)" }}>
                <Pencil size={16} />
              </a>
            </div>
            <div style={{ marginTop: 12 }}>
              <Abas itens={[{ v: "todas", r: "Todas" }, { v: "nao_lidas", r: "Não lidas", n: naoLidas }, { v: "atendimento", r: "Em atendimento" }, { v: "resolvidas", r: "Resolvidas" }]} ativo={aba} onChange={setAba} />
            </div>
            <div style={{ marginTop: 12 }}>
              <Busca placeholder="Buscar conversas..." value={busca} onChange={setBusca} suave />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ padding: "10px 8px 12px", minHeight: 0 }}>
            {itens === null && <Vazio>Carregando…</Vazio>}
            {itens !== null && lista.length === 0 && (
              <Vazio>{todas.length ? "Nada nesse filtro." : "Nenhuma conversa ainda. Quem comentar num post ou mandar direct para a sua conta aparece aqui."}</Vazio>
            )}
            {lista.map((it) => {
              const on = it.id === aberto;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => { setAberto(it.id); setVista("conversa"); setErro(null); }}
                  className={`w-full text-left flex items-center border-0 cursor-pointer ${on ? "" : "m-row"}`}
                  style={{ gap: 12, padding: "11px 12px", borderRadius: 12, background: on ? "var(--m-panel)" : "transparent", boxShadow: on ? "inset 3px 0 0 var(--accent)" : "none", font: "inherit", color: "inherit" }}
                >
                  <Avatar nome={nomeDe(it)} size={42} ig />
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontSize: 14, fontWeight: it.pendente ? 800 : 700 }}>{nomeDe(it)}</div>
                    <div className="truncate" style={{ fontSize: 13, color: it.pendente ? "var(--text-primary)" : "var(--m-text-dim)", marginTop: 2 }}>{it.ultima || "—"}</div>
                  </div>
                  <div className="flex flex-col items-end shrink-0" style={{ gap: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--m-text-faint)", fontWeight: 600 }}>{quandoCurto(it.em)}</span>
                    {it.pendente && <span className="rounded-full" style={{ background: "var(--accent)", width: 10, height: 10 }} />}
                    {!it.pendente && it.atendimento && <span className="rounded-full" style={{ background: "var(--warning)", width: 8, height: 8 }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* ---------- conversa ---------- */}
      {verConversa && (
        <Card pad={0} className="flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
          {!c || !det ? (
            <div className="flex-1 flex items-center justify-center"><Vazio>{aberto ? "Carregando…" : "Escolha uma conversa ao lado."}</Vazio></div>
          ) : (
            <>
              <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid var(--m-divider)" }}>
                <div className="flex items-center gap-3">
                  {mobile && <button type="button" onClick={() => setVista("lista")} aria-label="voltar" className="flex border-0 bg-transparent cursor-pointer p-0" style={{ color: "var(--text-primary)", marginLeft: -6 }}><ChevronLeft size={24} /></button>}
                  <Avatar nome={nomeDe(c)} size={mobile ? 40 : 46} ig />
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontSize: mobile ? 16 : 18, fontWeight: 800, letterSpacing: "-.02em" }}>{nomeDe(c)}</div>
                    <div style={{ fontSize: 13, color: "var(--m-text-dim)" }}>{c.username ? `@${c.username}` : "perfil sem @"}</div>
                  </div>
                  {!largo && (
                    <button type="button" onClick={() => setVista("detalhes")} aria-label="detalhes do contato" className="flex items-center justify-center border-0 cursor-pointer" style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-dim)", color: "var(--accent)" }}><Info size={19} /></button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 12 }}>
                  {c.tags.slice(0, 4).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5 rounded-full" style={{ border: "1px solid var(--border-strong)", padding: "5px 11px", fontSize: 12.5, fontWeight: 600 }}>
                      <span className="rounded-full" style={{ width: 6, height: 6, background: "var(--accent)" }} /> {t.replace(/_/g, " ")}
                    </span>
                  ))}
                  <TagNova valor={novaTag} setValor={setNovaTag} onSalvar={tag} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col" style={{ padding: mobile ? "14px 12px" : "16px 20px", gap: 14, minHeight: 0 }}>
                {det.mensagens.length === 0 && <Vazio>Ainda sem mensagens registradas.</Vazio>}
                {det.mensagens.map((m, i) => {
                  const dela = m.direcao === "entrada";
                  const novoDia = i === 0 || diaDe(m.em) !== diaDe(det.mensagens[i - 1].em);
                  return (
                    <div key={m.id} className="contents">
                      {novoDia && <div className="text-center" style={{ fontSize: 12, color: "var(--m-text-placeholder)" }}>{quando(m.em, false)}</div>}
                      {dela ? (
                        <div className="flex items-end" style={{ gap: 10, maxWidth: mobile ? "88%" : "72%" }}>
                          <Avatar nome={nomeDe(c)} size={30} />
                          <div>
                            {m.origem === "comentario" && <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--m-text-dim)", marginBottom: 4 }}>💬 comentou no post</div>}
                            <div style={{ background: m.origem === "comentario" ? "var(--bg-card)" : "var(--m-neutral-bg)", border: m.origem === "comentario" ? "1px dashed var(--m-row-border)" : "none", borderRadius: "16px 16px 16px 5px", padding: "12px 15px", fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.texto || "—"}</div>
                            <div style={{ fontSize: 11.5, color: "var(--m-text-faint)", marginTop: 4 }}>{horaDe(m.em)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="self-end flex flex-col items-end" style={{ maxWidth: mobile ? "88%" : "72%" }}>
                          <div className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: "var(--m-text-faint)", marginBottom: 4 }}>
                            {m.origem === "automacao" ? <span className="inline-flex items-center gap-1"><Zap size={11} /> automação</span> : m.origem === "instagram" ? "você, pelo Instagram" : "você"} · {horaDe(m.em)}
                          </div>
                          <div style={{ background: m.origem === "automacao" ? "var(--m-tint)" : "var(--accent)", color: m.origem === "automacao" ? "var(--text-primary)" : "#fff", borderRadius: "16px 16px 5px 16px", padding: "12px 15px", fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.texto}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={fim} />
              </div>

              <div style={{ padding: mobile ? "10px 12px 12px" : "12px 20px 18px", borderTop: "1px solid var(--m-divider)" }}>
                {det.janelaAberta ? (
                  <>
                    <div className={largo ? "flex gap-2 flex-wrap" : "flex gap-2 overflow-x-auto"} style={largo ? undefined : { whiteSpace: "nowrap", paddingBottom: 4, scrollbarWidth: "none" }}>
                      {RAPIDAS.map((r) => (
                        <button key={r} type="button" onClick={() => setTexto(r)} className="cursor-pointer" style={{ border: "1px solid var(--border-strong)", background: "var(--bg-card)", borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, color: "var(--m-text-body)", font: "inherit" }}>{r}</button>
                      ))}
                    </div>
                    {det.janelaFecha && <div className="flex items-center" style={{ gap: 6, fontSize: 12, color: "var(--m-text-dim)", marginTop: 10 }}><Clock size={13} /> Dá para responder até {quando(det.janelaFecha)}.</div>}
                  </>
                ) : (
                  <div className="flex items-start" style={{ gap: 9, padding: "10px 13px", borderRadius: 11, background: "var(--m-warning-bg)", color: "var(--m-gold)", fontSize: 12.5, lineHeight: 1.5 }}>
                    <Clock size={15} className="shrink-0" style={{ marginTop: 1 }} />
                    <span>A Meta só deixa responder até 24 h depois da última mensagem da pessoa no direct. Quando ela escrever (ou tocar num botão), dá para responder por aqui. <a href="https://www.instagram.com/direct/inbox/" target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>Abrir o Instagram</a></span>
                  </div>
                )}
                {erro && <div role="alert" style={{ marginTop: 10, fontSize: 12.5, color: "var(--danger-text)", background: "var(--m-danger-bg)", border: "1px solid var(--m-danger-border)", borderRadius: 10, padding: "8px 12px" }}>{erro}</div>}
                <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="flex items-center" style={{ gap: 10, marginTop: 12 }}>
                  <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={det.janelaAberta ? "Digite uma mensagem..." : "Janela de 24 h fechada"} disabled={!det.janelaAberta} className="m-input" style={{ flex: 1, height: 44 }} aria-label="mensagem" maxLength={1000} />
                  <button type="submit" disabled={enviando || !texto.trim() || !det.janelaAberta} aria-label="enviar" className="flex items-center justify-center border-0 cursor-pointer shrink-0" style={{ width: 44, height: 44, borderRadius: 11, background: "var(--accent)", color: "#fff", boxShadow: "var(--glow-accent)", opacity: enviando || !texto.trim() || !det.janelaAberta ? 0.5 : 1 }}>
                    {enviando ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  </button>
                </form>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ---------- detalhes ---------- */}
      {verDetalhes && (
        <div className="flex flex-col overflow-y-auto" style={{ gap: 16, minHeight: 0 }}>
          {c && det && (
            <>
              <Card pad={18}>
                <div className="flex items-center" style={{ gap: 8, fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>
                  {!largo && <button type="button" onClick={() => setVista("conversa")} aria-label="voltar" className="flex border-0 bg-transparent cursor-pointer p-0" style={{ color: "var(--text-primary)", marginLeft: -4 }}><ChevronLeft size={22} /></button>}
                  Detalhes do contato
                </div>
                <div className="flex items-center gap-3" style={{ marginTop: 14 }}>
                  <Avatar nome={nomeDe(c)} size={46} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontSize: 14.5, fontWeight: 700 }}>{nomeDe(c)}</div>
                    {c.username && <div style={{ fontSize: 12.5, color: "var(--m-text-dim)" }}>@{c.username}</div>}
                  </div>
                  {c.username && <a href={`https://www.instagram.com/${c.username}/`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{ fontSize: 12.5, fontWeight: 700 }}>Ver perfil <ExternalLink size={12} /></a>}
                </div>
                <div className="grid text-center" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14, padding: "12px 0", borderTop: "1px solid var(--m-divider)", borderBottom: "1px solid var(--m-divider)" }}>
                  <Stat v={String(det.mensagens.filter((m) => m.origem !== "comentario").length)} r="Mensagens" />
                  <Stat v={String(det.comentarios)} r="Comentários" />
                </div>
                <div className="flex flex-col" style={{ gap: 9, marginTop: 14, fontSize: 13 }}>
                  <Linha icone={<Mail size={15} />} v={c.email || "sem e-mail"} vazio={!c.email} />
                  <Linha icone={<Phone size={15} />} v={c.telefone || "sem telefone"} vazio={!c.telefone} />
                  <Linha icone={<Calendar size={15} />} v={`Contato desde ${quando(c.desde, false)}`} />
                </div>
                <Link href={`/app/contatos?contato=${c.id}`} className="m-btn-2" style={{ width: "100%", marginTop: 14, fontSize: 13 }}>Editar dados do contato</Link>
              </Card>

              <Card pad={18}>
                <div className="flex items-center">
                  <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>Etiquetas</span>
                  <button type="button" onClick={() => setNovaTag("")} className="ml-auto inline-flex items-center gap-1 border-0 bg-transparent cursor-pointer" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)", font: "inherit" }}><Plus size={13} /> Adicionar</button>
                </div>
                <div className="flex flex-wrap gap-1.5" style={{ marginTop: 12 }}>
                  {c.tags.length === 0 && <span style={{ fontSize: 12.5, color: "var(--m-text-dim)" }}>Sem etiquetas. Use para separar clientes, interessados, VIPs…</span>}
                  {c.tags.map((t) => (
                    <Pill key={t} tom="roxo" dot>
                      {t.replace(/_/g, " ")}
                      <button type="button" onClick={() => tag(t, true)} aria-label={`tirar etiqueta ${t}`} className="border-0 bg-transparent cursor-pointer flex p-0" style={{ color: "inherit", opacity: 0.7 }}><X size={11} /></button>
                    </Pill>
                  ))}
                </div>
              </Card>

              <Card pad={18}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>Status da conversa</div>
                <select value={c.status} onChange={(e) => status(e.target.value as "atendimento" | "resolvida")} className="m-select" style={{ marginTop: 12, width: "100%" }} aria-label="status da conversa">
                  <option value="atendimento">● Em atendimento</option>
                  <option value="resolvida">● Resolvida</option>
                </select>
              </Card>

              <Card pad={18}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>Histórico de automações</div>
                <div className="flex flex-col" style={{ gap: 11, marginTop: 12 }}>
                  {det.historico.length === 0 && <span style={{ fontSize: 12.5, color: "var(--m-text-dim)" }}>Nada ainda.</span>}
                  {det.historico.slice(0, 6).map((e, i) => (
                    <div key={i} className="flex items-start" style={{ gap: 10 }}>
                      <span className="flex shrink-0" style={{ color: e.tipo.endsWith("_error") ? "var(--danger-text)" : "var(--accent)", marginTop: 1 }}>{e.tipo.startsWith("public") ? <MessageSquare size={15} /> : <GitBranch size={15} />}</span>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{ROTULO_ACAO[e.tipo] ?? e.tipo}</div>
                        {e.fluxo && <div className="truncate" style={{ fontSize: 12, color: "var(--m-text-dim)" }}>{e.fluxo}</div>}
                      </div>
                      <span className="shrink-0" style={{ fontSize: 11.5, color: "var(--m-text-faint)" }}>{quandoCurto(e.quando)}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card pad={18}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>Ações rápidas</div>
                <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  <Acao icone={<UserCheck size={15} />} onClick={() => status("atendimento")}>Assumir conversa</Acao>
                  <Acao icone={<CheckCircle2 size={15} />} onClick={() => status("resolvida")}>Marcar resolvida</Acao>
                  <Acao icone={<GitBranch size={15} />} href="/app/fluxos">Ver automações</Acao>
                  <button type="button" onClick={bloquear} className="m-btn-danger" style={{ fontSize: 12.5, padding: "10px 8px" }}><Ban size={15} /> Bloquear</button>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TagNova({ valor, setValor, onSalvar }: { valor: string | null; setValor: (v: string | null) => void; onSalvar: (t: string) => void }) {
  if (valor == null) {
    return <button type="button" onClick={() => setValor("")} className="inline-flex items-center gap-1 border-0 bg-transparent cursor-pointer" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)", font: "inherit" }}><Plus size={14} /> Etiqueta</button>;
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valor.trim()) onSalvar(valor.trim()); }} className="inline-flex items-center gap-1">
      <input autoFocus value={valor} onChange={(e) => setValor(e.target.value)} placeholder="nova etiqueta" aria-label="nova etiqueta" className="m-input" style={{ height: 30, width: 140, fontSize: 12.5 }} maxLength={40} />
      <button type="button" onClick={() => setValor(null)} aria-label="cancelar" className="border-0 bg-transparent cursor-pointer flex" style={{ color: "var(--m-text-dim)" }}><X size={14} /></button>
    </form>
  );
}

function Stat({ v, r }: { v: string; r: string }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 800 }}>{v}</div>
      <div style={{ fontSize: 11.5, color: "var(--m-text-dim)" }}>{r}</div>
    </div>
  );
}

function Linha({ icone, v, vazio }: { icone: React.ReactNode; v: string; vazio?: boolean }) {
  return (
    <div className="flex items-center" style={{ gap: 9, color: vazio ? "var(--m-text-faint)" : "var(--m-text-body)" }}>
      <span className="flex" style={{ color: "var(--m-text-dim)" }}>{icone}</span>
      <span className="truncate">{v}</span>
    </div>
  );
}

function Acao({ icone, children, onClick, href }: { icone: React.ReactNode; children: React.ReactNode; onClick?: () => void; href?: string }) {
  const style = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1px solid var(--border-strong)", background: "var(--bg-card)", borderRadius: 11, padding: "10px 8px", fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", cursor: "pointer", font: "inherit" } as const;
  if (href) return <Link href={href} style={style}><span style={{ color: "var(--accent)", display: "flex" }}>{icone}</span>{children}</Link>;
  return <button type="button" onClick={onClick} style={style}><span style={{ color: "var(--accent)", display: "flex" }}>{icone}</span>{children}</button>;
}
