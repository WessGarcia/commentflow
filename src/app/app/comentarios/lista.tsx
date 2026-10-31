"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ChevronLeft, Clock, ExternalLink, Eye, EyeOff, Heart, Key, Loader2, MessageCircle, MessageSquare, Send, Zap } from "lucide-react";
import type { ComentarioModeracao, Sentimento } from "@/lib/comentarios";
import { AbasLinha, Avatar, Busca, Card, Paginacao, Pill, Vazio, useMobile } from "../_ui/ui";
import { fmt, quando, quandoCurto } from "../_ui/fmt";

/**
 * Moderação (como na Mandei): lista, o comentário aberto com o post, e as
 * ações. Tudo que muda algo passa por /api/comentarios e acontece de verdade
 * no Instagram (responder, direct, ocultar, aplicar automação).
 * Três colunas a partir de 1280 px; abaixo, as ações descem para baixo do
 * comentário; no celular, lista e comentário se alternam.
 */

type Post = { legenda: string; imagem: string | null; link: string | null; curtidas: number; comentarios: number; quando: string | null } | null;

const TOM_SENT: Record<Sentimento, "verde" | "azul" | "rosa" | "vermelho" | "cinza"> = { Positivo: "verde", Dúvida: "azul", Interesse: "rosa", Negativo: "vermelho", Neutro: "cinza" };
const nome = (c: { username: string | null }) => (c.username ? `@${c.username}` : "alguém");
const POR_PAGINA = 8;

const MQ = "(min-width: 1280px)";
const assinar = (cb: () => void) => { const m = window.matchMedia(MQ); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const useLargo = () => useSyncExternalStore(assinar, () => window.matchMedia(MQ).matches, () => true);

export function Moderacao({ inicial, fluxos, conta, qInicial, abrir }: { inicial: ComentarioModeracao[]; fluxos: { id: string; nome: string }[]; conta: string | null; qInicial: string; abrir?: string }) {
  const [itens, setItens] = useState(inicial);
  const [aba, setAba] = useState("todos");
  const [q, setQ] = useState(qInicial);
  const [ordem, setOrdem] = useState("recentes");
  const [pagina, setPagina] = useState(1);
  const mobile = useMobile();
  const largo = useLargo() && !mobile;
  const [sel, setSel] = useState<string | null>(abrir ?? null);
  const [vista, setVista] = useState<"lista" | "detalhe">(abrir ? "detalhe" : "lista");
  const [posts, setPosts] = useState<Record<string, Post>>({});
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [fluxoEscolhido, setFluxoEscolhido] = useState(fluxos[0]?.id ?? "");

  const contagem = {
    todos: itens.length,
    nao: itens.filter((c) => c.status === "nao_respondido" && !c.ocultado).length,
    auto: itens.filter((c) => c.status === "automacao").length,
    res: itens.filter((c) => c.status === "resolvido").length,
  };
  const lista = useMemo(() => {
    let l = itens.filter((c) => (aba === "nao" ? c.status === "nao_respondido" && !c.ocultado : aba === "auto" ? c.status === "automacao" : aba === "res" ? c.status === "resolvido" : true));
    if (q) l = l.filter((c) => `${c.texto} ${c.username ?? ""} ${c.fluxo ?? ""}`.toLowerCase().includes(q.toLowerCase()));
    if (ordem === "antigos") l = [...l].reverse();
    return l;
  }, [itens, aba, q, ordem]);
  const pag = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // no computador, abre o primeiro: tela vazia não ajuda ninguém
  useEffect(() => {
    if (!mobile && !sel && itens.length) setSel(itens[0].id);
  }, [mobile, sel, itens]);

  const atual = itens.find((c) => c.id === sel) ?? null;
  const post = atual?.mediaId ? posts[atual.mediaId] : undefined;

  useEffect(() => {
    const id = atual?.mediaId;
    if (!id || id in posts) return;
    fetch(`/api/comentarios/post?id=${encodeURIComponent(id)}`).then((r) => r.json()).then((j) => setPosts((p) => ({ ...p, [id]: j.post ?? null }))).catch(() => setPosts((p) => ({ ...p, [id]: null })));
  }, [atual?.mediaId, posts]);

  async function recarregar() {
    const j = await fetch("/api/comentarios", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (j?.itens) setItens(j.itens);
  }
  async function agir(corpo: Record<string, unknown>, chave: string) {
    if (!atual) return;
    setOcupado(chave);
    setAviso(null);
    const r = await fetch("/api/comentarios", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ comentario: atual.id, ...corpo }) });
    const j = await r.json().catch(() => ({}));
    setOcupado(null);
    if (!r.ok) { setAviso({ tipo: "erro", texto: j.error || "Não deu certo. Tente de novo." }); return; }
    setAviso({ tipo: "ok", texto: j.aviso || "Feito." });
    if (corpo.acao === "responder" || corpo.acao === "dm") setTexto("");
    await recarregar();
  }
  function sugerir() {
    if (!atual) return;
    const s = atual.sentimento;
    const n = nome(atual);
    setTexto(s === "Dúvida" ? `Boa pergunta, ${n}! Te respondi no direct 👀` : s === "Negativo" ? `Poxa, ${n}. Me chama no direct que eu resolvo isso com você.` : s === "Positivo" ? `Valeu demais, ${n}! 🙌` : `Oi, ${n}! Te mandei mais detalhes no direct.`);
  }

  const colunas = mobile ? "minmax(0,1fr)" : largo ? "minmax(0,1fr) minmax(0,1.25fr) 300px" : "minmax(0,1fr) minmax(0,1.3fr)";
  const verLista = !mobile || vista === "lista";
  const verDetalhe = !mobile || vista === "detalhe";

  const acoes = atual && (
    <>
      <Card pad={18}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>Ações rápidas</div>
        <div className="flex flex-col" style={{ gap: 8, marginTop: 12 }}>
          <button type="button" disabled={!texto.trim() || !!ocupado} onClick={() => agir({ acao: "dm", texto }, "dm")} className="m-btn-2" style={{ width: "100%", justifyContent: "flex-start" }} title="Usa o texto que você escreveu">
            {ocupado === "dm" ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} style={{ color: "var(--accent)" }} />} Responder no direct
          </button>
          <div className="flex" style={{ gap: 6 }}>
            <select value={fluxoEscolhido} onChange={(e) => setFluxoEscolhido(e.target.value)} className="m-select" style={{ height: 42, fontSize: 12.5, flex: 1, minWidth: 0 }} aria-label="automação para aplicar" disabled={!fluxos.length}>
              {fluxos.length === 0 && <option value="">Nenhuma automação</option>}
              {fluxos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <button type="button" disabled={!fluxoEscolhido || !!atual.fluxo || !!ocupado} onClick={() => agir({ acao: "aplicar", flowId: fluxoEscolhido }, "aplicar")} className="m-btn-2" style={{ padding: "0 12px" }} title="Trata esse comentário como se tivesse a palavra-chave">
              {ocupado === "aplicar" ? <Loader2 size={15} className="animate-spin" /> : <Key size={15} style={{ color: "var(--accent)" }} />} Aplicar
            </button>
          </div>
          <button type="button" disabled={!!ocupado} onClick={() => agir({ acao: atual.ocultado ? "mostrar" : "ocultar" }, "ocultar")} className="m-btn-2" style={{ width: "100%", justifyContent: "flex-start" }}>
            {atual.ocultado ? <Eye size={15} style={{ color: "var(--accent)" }} /> : <EyeOff size={15} style={{ color: "var(--accent)" }} />} {atual.ocultado ? "Mostrar comentário" : "Ocultar comentário"}
          </button>
        </div>
      </Card>

      <Card pad={18}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>Status e automação</div>
        <div className="flex flex-col" style={{ gap: 10, marginTop: 12, fontSize: 13 }}>
          <Linha rotulo="Status">
            <select value={atual.status === "nao_respondido" ? "nao" : "res"} onChange={(e) => agir({ acao: "status", resolvido: e.target.value === "res" }, "status")} disabled={atual.status === "automacao" || !!ocupado} className="m-select" style={{ height: 40, fontSize: 12.5, width: "100%" }} aria-label="status do comentário">
              <option value="nao">● Não respondido</option>
              <option value="res">● {atual.status === "automacao" ? "Respondido pela automação" : "Resolvido"}</option>
            </select>
          </Linha>
          <Linha rotulo="Automação"><span className="truncate" style={{ fontWeight: 600 }}>{atual.fluxo ?? "Nenhuma"}</span></Linha>
          <Linha rotulo="Sentimento"><Pill tom={TOM_SENT[atual.sentimento]}>{atual.sentimento}</Pill></Linha>
        </div>
      </Card>

      <Card pad={18}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>Histórico</div>
        <div className="flex flex-col" style={{ gap: 10, marginTop: 12 }}>
          <Evento icone={<MessageCircle size={14} />} t="Comentário recebido" q={atual.em} />
          {atual.respondeuPublico && <Evento icone={<Zap size={14} />} t={`Automação respondeu (${atual.fluxo})`} q={atual.em} />}
          {atual.mandouDm && <Evento icone={<Send size={14} />} t="Direct enviado pela automação" q={atual.em} />}
          {atual.respostaManual && <Evento icone={<MessageSquare size={14} />} t="Você respondeu em público" q={atual.em} />}
          {atual.ocultado && <Evento icone={<EyeOff size={14} />} t="Comentário ocultado" q={atual.em} />}
          {!atual.fluxo && <Evento icone={<Clock size={14} />} t="Sem palavra-chave: a automação não respondeu" q={atual.em} />}
        </div>
      </Card>
    </>
  );

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <AbasLinha itens={[{ v: "todos", r: "Todos", n: contagem.todos }, { v: "nao", r: "Não respondidos", n: contagem.nao }, { v: "auto", r: "Com automação", n: contagem.auto }, { v: "res", r: "Resolvidos", n: contagem.res }]} ativo={aba} onChange={(v) => { setAba(v); setPagina(1); }} />
      </div>

      <div className="grid items-start" style={{ gridTemplateColumns: colunas, gap: 20 }}>
        {verLista && (
          <Card pad={0} className="overflow-hidden">
            <div className="flex items-center" style={{ gap: 8, padding: 14 }}>
              <Busca placeholder="Buscar comentário..." value={q} onChange={(v) => { setQ(v); setPagina(1); }} suave style={{ flex: 1 }} />
              <select value={ordem} onChange={(e) => setOrdem(e.target.value)} className="m-select" style={{ height: 40, fontSize: 12.5 }} aria-label="ordem">
                <option value="recentes">Mais recentes</option>
                <option value="antigos">Mais antigos</option>
              </select>
            </div>
            {pag.length === 0 && <Vazio>{itens.length ? "Nada nesse filtro." : "Nenhum comentário chegou ainda. Quando alguém comentar num post seu, aparece aqui."}</Vazio>}
            {pag.map((c) => {
              const on = c.id === sel;
              return (
                <button key={c.id} type="button" onClick={() => { setSel(c.id); setAviso(null); setVista("detalhe"); }} className={`w-full text-left flex items-start cursor-pointer ${on ? "" : "m-row"}`} style={{ gap: 10, padding: "12px 14px", border: 0, borderTop: "1px solid var(--m-divider-soft)", background: on ? "var(--m-surface)" : "transparent", boxShadow: on ? "inset 3px 0 0 var(--accent)" : "none", font: "inherit", color: "inherit" }}>
                  <Avatar nome={nome(c)} size={34} ig />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate" style={{ fontSize: 13.5, fontWeight: 700 }}>{nome(c)}</span>
                      {c.ocultado && <EyeOff size={13} style={{ color: "var(--m-text-dim)" }} />}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--m-text-body)", lineHeight: 1.45, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.texto || "(sem texto)"}</div>
                  </div>
                  <div className="flex flex-col items-end shrink-0" style={{ gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: "var(--m-text-faint)" }}>{quandoCurto(c.em)}</span>
                    <Pill tom={TOM_SENT[c.sentimento]}>{c.sentimento}</Pill>
                  </div>
                </button>
              );
            })}
            <Paginacao total={lista.length} porPagina={POR_PAGINA} pagina={pagina} onChange={setPagina} rotulo="comentários" />
          </Card>
        )}

        {verDetalhe && (
          <div className="flex flex-col min-w-0" style={{ gap: 16 }}>
            <Card>
              {!atual ? <Vazio>Escolha um comentário.</Vazio> : (
                <>
                  <div className="flex items-center gap-3">
                    {mobile && <button type="button" onClick={() => setVista("lista")} aria-label="voltar" className="flex border-0 bg-transparent cursor-pointer p-0" style={{ color: "var(--text-primary)", marginLeft: -6 }}><ChevronLeft size={24} /></button>}
                    <Avatar nome={nome(atual)} size={46} ig />
                    <div className="flex-1 min-w-0">
                      <div className="truncate" style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>{nome(atual)}</div>
                      <div style={{ fontSize: 12.5, color: "var(--m-text-dim)" }}>{quando(atual.em)}</div>
                    </div>
                    {atual.username && <a href={`https://www.instagram.com/${atual.username}/`} target="_blank" rel="noreferrer" className="m-btn-2 m-so-desktop" style={{ padding: "8px 12px", fontSize: 12.5 }}>Ver perfil <ExternalLink size={13} /></a>}
                  </div>

                  <div className="flex" style={{ gap: 14, marginTop: 16, border: "1px solid var(--m-row-border)", background: "var(--m-surface-subtle)", borderRadius: 14, padding: 14 }}>
                    <Miniatura post={post} conta={conta} />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--m-text-dim)", letterSpacing: ".06em" }}>POST DO COMENTÁRIO</div>
                      <div className="m-pretty" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {!atual.mediaId ? "Post não informado." : post ? post.legenda || "(sem legenda)" : post === null ? "Não deu para ler o post: conecte o Instagram para ver a legenda e a imagem." : "Carregando…"}
                      </div>
                      {post && (
                        <div className="flex items-center flex-wrap" style={{ gap: 14, marginTop: 8, fontSize: 12, color: "var(--m-text-dim)" }}>
                          {post.quando && <span>{quando(post.quando, false)}</span>}
                          <span className="inline-flex items-center gap-1"><Heart size={13} /> {fmt(post.curtidas)}</span>
                          <span className="inline-flex items-center gap-1"><MessageCircle size={13} /> {fmt(post.comentarios)}</span>
                          {post.link && <a href={post.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{ fontWeight: 700 }}>Abrir <ExternalLink size={11} /></a>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start" style={{ gap: 10, marginTop: 16 }}>
                    <Avatar nome={nome(atual)} size={36} />
                    <div className="flex-1 min-w-0">
                      <div style={{ background: "var(--m-neutral-bg)", borderRadius: 14, padding: "12px 14px", opacity: atual.ocultado ? 0.6 : 1 }}>
                        <div className="flex items-center gap-2" style={{ fontSize: 12.5 }}>
                          <span style={{ fontWeight: 700 }}>{nome(atual)}</span>
                          <span style={{ color: "var(--m-text-faint)" }}>{quandoCurto(atual.em)}</span>
                          {atual.ocultado && <span style={{ color: "var(--m-text-dim)", fontWeight: 700 }}>· oculto</span>}
                          <span className="ml-auto"><Pill tom={TOM_SENT[atual.sentimento]}>{atual.sentimento}</Pill></span>
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{atual.texto || "(sem texto)"}</div>
                      </div>
                      {(atual.respondeuPublico || atual.respostaManual) && (
                        <div className="flex items-start" style={{ gap: 8, marginTop: 12, paddingLeft: 12, borderLeft: "2px solid var(--m-panel-border)" }}>
                          <span className="flex shrink-0" style={{ color: "var(--accent)", marginTop: 2 }}>{atual.respostaManual ? <MessageSquare size={14} /> : <Zap size={14} />}</span>
                          <div style={{ fontSize: 13 }}>
                            <div style={{ fontSize: 11.5, color: "var(--m-text-dim)", fontWeight: 700 }}>{atual.respostaManual ? "Você respondeu" : `A automação respondeu (${atual.fluxo})`}</div>
                            {atual.respostaManual && <div style={{ marginTop: 2 }}>{atual.respostaManual}</div>}
                            {atual.mandouDm && <div style={{ fontSize: 11.5, color: "var(--m-text-dim)", marginTop: 2 }}>+ direct enviado</div>}
                          </div>
                        </div>
                      )}
                      {atual.erro && <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger-text)" }}>A automação não conseguiu: {atual.erro}.</div>}
                    </div>
                  </div>

                  <div style={{ marginTop: 18, border: "1px solid var(--border-strong)", borderRadius: 14, overflow: "hidden" }}>
                    <div className="flex items-center" style={{ borderBottom: "1px solid var(--m-divider)", padding: "0 6px" }}>
                      <span style={{ padding: "10px 8px", fontSize: 13, fontWeight: 700, color: "var(--accent)", borderBottom: "2.5px solid var(--accent)", marginBottom: -1 }}>Responder</span>
                      <button type="button" onClick={sugerir} className="ml-auto border-0 bg-transparent cursor-pointer" style={{ padding: "10px 8px", fontSize: 12.5, fontWeight: 700, color: "var(--m-text-dim)", font: "inherit" }}>✨ Sugerir uma resposta</button>
                    </div>
                    <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} placeholder="Digite sua resposta..." aria-label="resposta" className="w-full border-0" style={{ padding: 14, fontSize: 13.5, lineHeight: 1.5, resize: "none", outline: "none", display: "block", background: "transparent" }} maxLength={2200} />
                    <div className="flex items-center flex-wrap" style={{ gap: 8, padding: "8px 12px 12px" }}>
                      <span className="m-hint" style={{ margin: 0 }}>Responder em público aparece embaixo do comentário.</span>
                      <button type="button" disabled={!texto.trim() || !!ocupado} onClick={() => agir({ acao: "responder", texto }, "responder")} className="m-btn ml-auto" style={{ padding: "10px 14px", fontSize: 13 }}>
                        {ocupado === "responder" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Responder no Instagram
                      </button>
                    </div>
                  </div>
                  {aviso && <div role={aviso.tipo === "erro" ? "alert" : "status"} style={{ marginTop: 12, padding: "9px 12px", borderRadius: 10, fontSize: 12.5, background: aviso.tipo === "ok" ? "var(--m-success-bg)" : "var(--m-danger-bg)", color: aviso.tipo === "ok" ? "var(--success-text)" : "var(--danger-text)" }}>{aviso.texto}</div>}
                </>
              )}
            </Card>
            {!largo && acoes}
          </div>
        )}

        {largo && <div className="flex flex-col" style={{ gap: 16 }}>{acoes}</div>}
      </div>
    </>
  );
}

function Miniatura({ post, conta }: { post?: Post; conta: string | null }) {
  if (post?.imagem) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={post.imagem} alt="" className="shrink-0" style={{ width: 96, height: 96, borderRadius: 12, objectFit: "cover" }} />;
  }
  return (
    <span className="shrink-0 flex flex-col justify-end" style={{ width: 96, height: 96, borderRadius: 12, background: "linear-gradient(135deg, var(--accent), var(--m-pink))", color: "#fff", padding: 10, fontSize: 11, fontWeight: 700, lineHeight: 1.25 }}>
      {conta ? `@${conta}` : ""}
    </span>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <span style={{ width: 88, flex: "0 0 auto", color: "var(--text-muted)", fontWeight: 600 }}>{rotulo}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function Evento({ icone, t, q }: { icone: React.ReactNode; t: string; q: string }) {
  return (
    <div className="flex items-start" style={{ gap: 9 }}>
      <span className="flex shrink-0" style={{ color: "var(--accent)", marginTop: 2 }}>{icone}</span>
      <div className="flex-1 min-w-0" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{t}</div>
      <span className="shrink-0" style={{ fontSize: 11.5, color: "var(--m-text-faint)" }}>{quandoCurto(q)}</span>
    </div>
  );
}
