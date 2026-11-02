"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, AtSign, Check, ChevronLeft, ChevronRight, Hash, Heart, Instagram, Link2, Loader2, MessageCircle, Radio, Send, SmilePlus, Sparkles, Wand2, Workflow, X } from "lucide-react";
import { GATILHOS, TIPOS, type TipoGatilho } from "@/lib/gatilhos";
import { faltaNoPasso, nomeSugerido, payloadDoSimples, simplesEmBranco, type Simples } from "@/lib/modelos";
import { Avatar, Pill, Toggle } from "../_ui/ui";
import { SeletorPost } from "./seletor-post";

/**
 * MODO SIMPLES (como na Mandei): três perguntas e a automação está no ar.
 *
 *   1. Quando dispara   a palavra-chave e em qual publicação
 *   2. A mensagem       a pergunta com botão e a mensagem que entrega o link
 *   3. Publicar         a resposta pública, o nome e o botão de ligar
 *
 * À direita, o celular mostra a conversa inteira como a pessoa vai ver.
 * Salva pelo mesmo /api/flows do modo avançado.
 */

const PASSOS = [
  { n: 1 as const, titulo: "Quando dispara", sub: "A palavra e a publicação" },
  { n: 2 as const, titulo: "A mensagem", sub: "O que ela recebe no direct" },
  { n: 3 as const, titulo: "Publicar", sub: "Resposta pública e ligar" },
];

export function AutomacaoSimples({ inicial, id, usuario }: { inicial: Simples; id: string | null; usuario: string | null }) {
  const [s, setS] = useState<Simples>(inicial);
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<{ nome: string; id: string } | null>(null);
  const [trocandoTipo, setTrocandoTipo] = useState(false);
  const g = GATILHOS[s.tipo];
  const Ic = ICONE[s.tipo];

  const mudar = (fn: (x: Simples) => void) => setS((atual) => { const n = structuredClone(atual); fn(n); return n; });
  const falta = useMemo(() => faltaNoPasso(s, passo), [s, passo]);
  const ultimo = passo === 3;

  async function publicar() {
    if (falta.length) return;
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(id ? `/api/flows/${id}` : "/api/flows", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadDoSimples(s)) });
      if (!r.ok) return setErro("Não deu para salvar. Confira os campos e tente de novo.");
      const salvo = (await r.json()) as { id: string; name: string };
      setPronto({ nome: salvo.name, id: salvo.id });
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  if (pronto) return <Pronta nome={pronto.nome} id={pronto.id} editando={!!id} ativo={s.ativo} onOutra={() => { setPronto(null); setS(simplesEmBranco()); setPasso(1); }} />;

  return (
    <div className="rise-in" style={{ marginTop: 18 }}>
      <div className="flex items-center m-simples-topo" style={{ gap: 12, marginBottom: 14 }}>
        <Link href="/app/fluxos" className="m-so-desktop" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>Automações</Link>
        <ChevronRight size={16} className="m-so-desktop" style={{ color: "var(--m-text-placeholder)" }} />
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{id ? "Editar automação" : "Nova automação"}</span>
        <Pill tom="roxo"><Wand2 size={12} /> Modo simples</Pill>
        <Link href={id ? `/app/automacao?avancado=1&editar=${id}` : "/app/automacao?avancado=1"} className="m-btn-2 ml-auto" style={{ padding: "8px 13px", fontSize: 13 }}>
          <Workflow size={15} /> <span className="m-so-desktop">Modo avançado</span>
        </Link>
      </div>

      <div className="flex items-center m-simples-passos" style={{ gap: 8, marginBottom: 16 }}>
        {PASSOS.map((p, i) => {
          const feito = p.n < passo;
          const ativo = p.n === passo;
          return (
            <div key={p.n} className="flex items-center min-w-0" style={{ gap: 8, flex: 1 }}>
              <button
                type="button" onClick={() => p.n < passo && setPasso(p.n)}
                className="flex items-center min-w-0 cursor-pointer text-left"
                style={{ gap: 9, padding: "8px 12px", borderRadius: 12, flex: 1, font: "inherit", color: "inherit", background: ativo ? "var(--m-surface)" : "transparent", border: `1.5px solid ${ativo ? "var(--accent)" : "transparent"}` }}
              >
                <span className="flex items-center justify-center shrink-0" style={{ width: 26, height: 26, borderRadius: "50%", fontSize: 12.5, fontWeight: 800, background: feito || ativo ? "var(--accent)" : "var(--m-neutral-bg)", color: feito || ativo ? "#fff" : "var(--m-text-dim)" }}>
                  {feito ? <Check size={14} strokeWidth={3} /> : p.n}
                </span>
                <span className="min-w-0">
                  <span className="block truncate" style={{ fontSize: 13, fontWeight: 700 }}>{p.titulo}</span>
                  <span className="block truncate" style={{ fontSize: 11.5, color: "var(--m-text-dim)" }}>{p.sub}</span>
                </span>
              </button>
              {i < 2 && <ChevronRight size={15} className="shrink-0 m-so-desktop" style={{ color: "var(--m-text-placeholder)" }} />}
            </div>
          );
        })}
      </div>

      <div className="m-simples">
        <div className="m-card" style={{ padding: 22 }}>
          {passo === 1 && (
            <>
              <Titulo t="Quando a automação dispara" s="É a porta de entrada da conversa." />
              <button type="button" onClick={() => setTrocandoTipo((v) => !v)} className="w-full flex items-center text-left cursor-pointer" style={{ gap: 11, padding: 12, borderRadius: 12, border: "1.5px solid var(--accent)", background: "var(--m-surface)", marginTop: 14, font: "inherit", color: "inherit" }}>
                <span className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg, var(--accent), var(--m-pink))", color: "#fff" }}><Ic size={19} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block" style={{ fontSize: 13.5, fontWeight: 700 }}>{g.rotulo}</span>
                  <span className="block" style={{ fontSize: 12, color: "var(--m-text-dim)", lineHeight: 1.4 }}>{g.descricao}</span>
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)" }}>{trocandoTipo ? "fechar" : "trocar"}</span>
              </button>
              {trocandoTipo && (
                <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }}>
                  {TIPOS.map((k) => {
                    const K = ICONE[k];
                    return (
                      <button key={k} type="button" onClick={() => { mudar((x) => { x.tipo = k; if (GATILHOS[k].palavras === "nenhuma") { x.palavras = []; x.qualquer = true; } else if (x.qualquer && GATILHOS[k].palavras === "obrigatorias" && k !== "comentario") x.qualquer = false; }); setTrocandoTipo(false); }}
                        className="w-full flex items-center text-left cursor-pointer m-row" style={{ gap: 10, padding: "9px 11px", borderRadius: 10, border: `1.5px solid ${s.tipo === k ? "var(--accent)" : "var(--m-row-border)"}`, background: "var(--bg-card)", font: "inherit", color: "inherit" }}>
                        <K size={16} style={{ color: "var(--accent)" }} />
                        <span className="min-w-0"><span className="block" style={{ fontSize: 12.5, fontWeight: 700 }}>{GATILHOS[k].rotulo}</span><span className="block" style={{ fontSize: 11.5, color: "var(--m-text-dim)" }}>{GATILHOS[k].descricao}</span></span>
                      </button>
                    );
                  })}
                </div>
              )}

              {g.palavras === "nenhuma" ? (
                <div className="m-hint" style={{ marginTop: 16 }}>Esse gatilho não tem palavra-chave: vale para todo mundo que {s.tipo === "story_mencao" ? "marcar a sua conta num story" : "reagir a uma mensagem sua"}.</div>
              ) : (
              <div style={{ marginTop: 20 }}>
                <div className="m-label" style={{ display: "flex", alignItems: "center", gap: 5 }}><Hash size={13} /> Palavras-chave</div>
                <div className="m-hint" style={{ marginBottom: 8, marginTop: 0 }}>Quem {s.tipo === "story_resposta" ? "responder o story com" : "comentar"} uma delas entra na automação. Digite e aperte Enter. Vale se o texto contiver a palavra, sem diferenciar maiúsculas nem acentos.</div>
                {!s.qualquer && <Palavras valor={s.palavras} onChange={(v) => mudar((x) => { x.palavras = v; })} />}
                <label className="flex items-center cursor-pointer" style={{ gap: 8, marginTop: 10, fontSize: 13 }}>
                  <input type="checkbox" checked={s.qualquer} onChange={(e) => mudar((x) => { x.qualquer = e.target.checked; })} style={{ accentColor: "var(--accent)" }} />
                  {s.tipo === "story_resposta" ? "Vale qualquer resposta ao story, mesmo sem palavra-chave" : "Responder qualquer comentário, mesmo sem palavra-chave"}
                </label>
              </div>
              )}

              {g.post && (
              <div style={{ marginTop: 20 }}>
                <div className="m-label" style={{ display: "flex", alignItems: "center", gap: 5 }}><Instagram size={13} /> Em qual publicação</div>
                <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }}>
                  <Opcao ativa={!s.postId && !postManual(s)} onClick={() => mudar((x) => { x.postId = ""; })} t="Todas as publicações" sub="Vale em qualquer post ou reel da conta" />
                  <Opcao ativa={postManual(s)} onClick={() => mudar((x) => { x.postId = x.postId || " "; })} t="Um post específico" sub="Só no post ou reel que você escolher" />
                </div>
                {postManual(s) && (
                  <div style={{ marginTop: 10 }}>
                    <SeletorPost valor={s.postId} onChange={(id) => mudar((x) => { x.postId = id || " "; })} />
                  </div>
                )}
              </div>
              )}
              {s.tipo === "live" && <div className="m-hint" style={{ marginTop: 14 }}>Vale para qualquer live sua, e só enquanto ela está no ar: é a regra da Meta para responder comentários de live.</div>}
            </>
          )}

          {passo === 2 && (
            <>
              <Titulo t="O que a pessoa recebe no direct" s="Duas mensagens: a pergunta e a entrega." />
              <div style={{ marginTop: 14, display: "flex", gap: 9, padding: "11px 13px", borderRadius: 12, background: "var(--m-info-bg)", color: "var(--m-info-text)", fontSize: 12.5, lineHeight: 1.5 }}>
                <Sparkles size={15} className="shrink-0" style={{ marginTop: 1 }} />
                {g.respostaPrivada
                  ? <span>O Instagram só abre a conversa depois que a pessoa <b>toca no botão</b>. Por isso a primeira mensagem é uma pergunta: o toque dela libera a entrega do link.</span>
                  : <span>A pessoa já falou com você, então a conversa está aberta por 24 h: a pergunta é opcional e dá para mandar a entrega direto.</span>}
              </div>

              <div style={{ marginTop: 18 }}>
                <div className="m-label" style={{ display: "flex", alignItems: "center", gap: 5 }}><MessageCircle size={13} /> 1ª mensagem: a pergunta</div>
                <textarea className="m-textarea" rows={3} value={s.pergunta} onChange={(e) => mudar((x) => { x.pergunta = e.target.value; })} placeholder="Opa, vi seu comentário! Quer que eu te mande aqui?" />
                <div className="m-hint">Deixe em branco para mandar só a entrega, sem botão.</div>
              </div>

              {s.pergunta.trim() && (
                <div style={{ marginTop: 16 }}>
                  <div className="m-label" style={{ display: "flex", alignItems: "center", gap: 5 }}><Check size={13} /> Texto do botão</div>
                  <input className="m-input" maxLength={20} value={s.botao} onChange={(e) => mudar((x) => { x.botao = e.target.value; })} placeholder="Quero" />
                  <div className="m-hint">Até 20 caracteres. É o que abre a conversa.</div>
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <div className="m-label" style={{ display: "flex", alignItems: "center", gap: 5 }}><Send size={13} /> {s.pergunta.trim() ? "2ª mensagem: a entrega" : "A mensagem do direct"}</div>
                <textarea className="m-textarea" rows={4} value={s.entrega} onChange={(e) => mudar((x) => { x.entrega = e.target.value; })} placeholder="Aqui está: {link}" />
                <div className="flex items-center" style={{ gap: 8, marginTop: 6 }}>
                  {!s.entrega.includes("{link}") ? (
                    <button type="button" onClick={() => mudar((x) => { x.entrega = `${x.entrega.trimEnd()}\n{link}`.trim(); })} className="border-0 bg-transparent cursor-pointer p-0" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)", font: "inherit" }}>Inserir o link no texto</button>
                  ) : (
                    <span className="m-hint" style={{ margin: 0 }}>Vazio = não manda direct.</span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="m-label" style={{ display: "flex", alignItems: "center", gap: 5 }}><Link2 size={13} /> O link</div>
                <input className="m-input" value={s.link} onChange={(e) => mudar((x) => { x.link = e.target.value; })} placeholder="https://… (a aula, a página, o catálogo)" />
                <div className="m-hint">Entra no lugar de <code>{"{link}"}</code> na mensagem.</div>
              </div>
            </>
          )}

          {passo === 3 && (
            <>
              <Titulo t="Publicar" s="A última parte, e já está no ar." />
              {g.publica && <div style={{ marginTop: 16 }}>
                <div className="m-label" style={{ display: "flex", alignItems: "center", gap: 5 }}><Heart size={13} /> Resposta pública no comentário</div>
                <div className="m-hint" style={{ marginBottom: 8, marginTop: 0 }}>Uma por linha. Cada comentário recebe uma delas, para não parecer robô. Vazio = não responde no post.</div>
                <textarea className="m-textarea" rows={4} value={s.publicas.join("\n")} onChange={(e) => mudar((x) => { x.publicas = e.target.value.split("\n"); })} placeholder={"Te mandei no direct 👀\nMandei lá no direct, dá uma olhada"} />
              </div>}

              <div style={{ marginTop: 18 }}>
                <div className="m-label">Nome da automação</div>
                <input className="m-input" value={s.nome} onChange={(e) => mudar((x) => { x.nome = e.target.value; })} placeholder={nomeSugerido({ ...s, nome: "" })} />
                <div className="m-hint">Só para você achar depois. Vai salvar como <b>{nomeSugerido(s)}</b>.</div>
              </div>

              <div className="flex items-center" style={{ gap: 12, marginTop: 20 }}>
                <Toggle lg on={s.ativo} onChange={(v) => mudar((x) => { x.ativo = v; })} rotulo="automação ativa" />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.ativo ? "Ligada: responde assim que salvar" : "Desligada: salva sem responder ainda"}</span>
              </div>

              <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: "var(--m-neutral-bg)", fontSize: 12.5, lineHeight: 1.6, color: "var(--m-text-body)" }}>
                <b>Resumo:</b> quando alguém {resumoGatilho(s)},
                {g.publica && s.publicas.some((p) => p.trim()) ? " o CommentFlow responde no comentário" : ""}
                {g.publica && s.publicas.some((p) => p.trim()) && s.entrega.trim() ? " e" : ""}
                {s.entrega.trim() ? (s.pergunta.trim() ? " manda a pergunta com o botão; quem tocar recebe a mensagem com o link" : " manda a mensagem no direct") : ""}.
              </div>
            </>
          )}

          {(falta.length > 0 || erro) && (
            <div role="alert" style={{ marginTop: 16, padding: "10px 13px", borderRadius: 11, background: erro ? "var(--m-danger-soft)" : "var(--m-warning-bg)", color: erro ? "var(--danger-text)" : "var(--m-gold)", fontSize: 12.5, lineHeight: 1.5 }}>
              {erro || falta[0]}
            </div>
          )}

          <div className="flex items-center" style={{ gap: 10, marginTop: 22 }}>
            {passo > 1 && <button type="button" onClick={() => { setErro(null); setPasso((p) => (p - 1) as 1 | 2 | 3); }} className="m-btn-2"><ChevronLeft size={16} /> Voltar</button>}
            {!ultimo && <button type="button" disabled={falta.length > 0} onClick={() => { setErro(null); setPasso((p) => (p + 1) as 1 | 2 | 3); }} className="m-btn ml-auto">Continuar <ArrowRight size={16} /></button>}
            {ultimo && (
              <button type="button" disabled={salvando || falta.length > 0} onClick={publicar} className="m-btn ml-auto">
                {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {id ? "Salvar alterações" : s.ativo ? "Criar e ligar automação" : "Criar automação"}
              </button>
            )}
          </div>
        </div>

        <Telefone s={s} usuario={usuario} />
      </div>
    </div>
  );
}

const ICONE: Record<TipoGatilho, typeof MessageCircle> = { comentario: MessageCircle, live: Radio, story_resposta: Send, story_mencao: AtSign, reacao: SmilePlus };

function resumoGatilho(s: Simples) {
  const palavras = s.palavras.filter(Boolean).map((p) => `“${p}”`).join(" ou ") || "a palavra-chave";
  switch (s.tipo) {
    case "comentario": return `${s.qualquer ? "comentar qualquer coisa" : `comentar ${palavras}`}${s.postId.trim() ? " naquela publicação" : " em qualquer publicação"}`;
    case "live": return `comentar ${palavras} na sua live`;
    case "story_resposta": return s.qualquer ? "responder um story seu" : `responder um story seu com ${palavras}`;
    case "story_mencao": return "marcar a sua conta num story";
    case "reacao": return "reagir a uma mensagem sua no direct";
  }
}

/** "Um post específico" escolhido; o espaço guarda a escolha enquanto o ID está vazio. */
const postManual = (s: Simples) => s.postId !== "";

function Titulo({ t, s }: { t: string; s: string }) {
  return (
    <div>
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>{t}</div>
      <div style={{ fontSize: 13, color: "var(--m-text-dim)", marginTop: 3 }}>{s}</div>
    </div>
  );
}

function Opcao({ ativa, onClick, t, sub }: { ativa: boolean; onClick: () => void; t: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center text-left cursor-pointer" style={{ gap: 10, padding: 9, borderRadius: 11, border: `1.5px solid ${ativa ? "var(--accent)" : "var(--m-row-border)"}`, background: ativa ? "var(--m-surface)" : "var(--bg-card)", font: "inherit", color: "inherit" }}>
      <span className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, var(--accent), var(--m-pink))", color: "#fff" }}><Instagram size={17} /></span>
      <span className="min-w-0 flex-1"><span className="block" style={{ fontSize: 12.8, fontWeight: 700 }}>{t}</span><span className="block truncate" style={{ fontSize: 11.5, color: "var(--m-text-dim)" }}>{sub}</span></span>
      {ativa && <Check size={16} style={{ color: "var(--accent)" }} />}
    </button>
  );
}

/** Palavras-chave como etiquetas: digita e Enter (ou vírgula) vira uma. */
function Palavras({ valor, onChange }: { valor: string[]; onChange: (v: string[]) => void }) {
  const [txt, setTxt] = useState("");
  const juntar = (bruto: string) => {
    const novas = bruto.split(",").map((x) => x.trim().toLowerCase()).filter((x) => x && !valor.includes(x));
    if (novas.length) onChange([...valor, ...novas]);
    setTxt("");
  };
  return (
    <div style={{ border: "1.5px solid var(--border-strong)", borderRadius: 11, padding: 8, background: "var(--bg-card)" }}>
      <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
        {valor.map((p) => (
          <span key={p} className="flex items-center" style={{ gap: 5, background: "var(--m-tint)", color: "var(--accent)", borderRadius: 999, padding: "5px 9px", fontSize: 12.5, fontWeight: 700 }}>
            {p}
            <button type="button" onClick={() => onChange(valor.filter((x) => x !== p))} aria-label={`tirar ${p}`} className="flex border-0 bg-transparent cursor-pointer p-0" style={{ color: "inherit" }}><X size={12} /></button>
          </span>
        ))}
        <input
          value={txt} onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); juntar(txt); } if (e.key === "Backspace" && !txt && valor.length) onChange(valor.slice(0, -1)); }}
          onBlur={() => txt.trim() && juntar(txt)}
          placeholder={valor.length ? "mais uma…" : "quero, manda, link…"}
          aria-label="palavra-chave"
          className="flex-1 border-0 bg-transparent" style={{ minWidth: 120, outline: "none", fontSize: 13.5, padding: "5px 4px", font: "inherit", color: "inherit" }}
        />
      </div>
    </div>
  );
}

/** A conversa inteira como a pessoa vai ver, num celular. */
function Telefone({ s, usuario }: { s: Simples; usuario: string | null }) {
  const link = s.link.trim() || "https://seulink.com";
  const troca = (x: string) => x.split("{link}").join(link);
  const palavra = s.qualquer ? "Amei! 😍" : s.palavras.filter(Boolean)[0] || "palavra-chave";
  const g = GATILHOS[s.tipo];
  const publica = g.publica ? s.publicas.filter((p) => p.trim())[0] : undefined;
  const origem = s.tipo === "comentario" ? "NO COMENTÁRIO DO POST" : s.tipo === "live" ? "NO COMENTÁRIO DA LIVE" : s.tipo === "story_resposta" ? "RESPONDEU SEU STORY" : s.tipo === "story_mencao" ? "MENCIONOU VOCÊ NO STORY" : "REAGIU À SUA MENSAGEM";
  const fala = s.tipo === "story_mencao" ? "📸 marcou @você no story" : s.tipo === "reacao" ? "❤️ reagiu à sua mensagem" : palavra;
  return (
    <div className="m-simples-fone">
      <div style={{ position: "sticky", top: 10 }}>
        <div style={{ border: "1px solid var(--m-row-border)", borderRadius: 26, background: "var(--bg-card)", boxShadow: "var(--m-shadow-panel)", overflow: "hidden" }}>
          <div className="flex items-center" style={{ gap: 9, padding: "13px 15px", borderBottom: "1px solid var(--m-row-border)" }}>
            <Avatar nome={usuario || "Você"} size={30} ig />
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>{usuario ? `@${usuario}` : "a sua conta"}</div>
              <div style={{ fontSize: 11, color: "var(--m-text-dim)" }}>Instagram · direct</div>
            </div>
          </div>

          <div style={{ padding: "14px 15px 18px", display: "flex", flexDirection: "column", gap: 10, maxHeight: "62vh", overflowY: "auto" }}>
            <div style={{ border: "1px dashed var(--m-row-border)", borderRadius: 13, padding: "10px 12px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", color: "var(--m-text-dim)" }}>{origem}</div>
              <div style={{ fontSize: 12.5, marginTop: 6 }}><b>@fulano</b> {fala}</div>
              {publica && <div style={{ fontSize: 12.5, marginTop: 4, color: "var(--accent)" }}><b>você</b> {publica}</div>}
            </div>

            {s.pergunta.trim() && s.entrega.trim() && (
              <>
                <Balao>
                  {troca(s.pergunta)}
                  <div className="text-center" style={{ marginTop: 10, background: "var(--bg-card)", borderRadius: 10, padding: "8px 12px", fontWeight: 700, whiteSpace: "normal" }}>{s.botao || "Quero"}</div>
                </Balao>
                <div className="flex items-center" style={{ gap: 7, fontSize: 11, color: "var(--m-text-dim)", margin: "2px 0" }}>
                  <span style={{ height: 1, flex: 1, background: "var(--m-row-border)" }} />a pessoa toca no botão<span style={{ height: 1, flex: 1, background: "var(--m-row-border)" }} />
                </div>
              </>
            )}
            {s.entrega.trim() ? <Balao>{troca(s.entrega)}</Balao> : <div style={{ fontSize: 12, color: "var(--m-text-dim)", textAlign: "center" }}>Sem direct nesta automação.</div>}
          </div>
        </div>
        <div className="m-hint" style={{ textAlign: "center", marginTop: 10 }}>É assim que a pessoa vê.</div>
      </div>
    </div>
  );
}

function Balao({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "var(--m-neutral-bg)", borderRadius: "16px 16px 16px 5px", padding: "10px 13px", fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-wrap", maxWidth: "88%", wordBreak: "break-word" }}>{children}</div>;
}

/** Depois de publicar: o que acontece agora, e por onde seguir. */
function Pronta({ nome, id, editando, ativo, onOutra }: { nome: string; id: string; editando: boolean; ativo: boolean; onOutra: () => void }) {
  return (
    <div className="rise-in m-card" style={{ maxWidth: 560, margin: "40px auto", padding: 30, textAlign: "center" }}>
      <span className="inline-flex items-center justify-center" style={{ width: 58, height: 58, borderRadius: 18, background: "var(--m-success-bg)", color: "var(--success-text)" }}><Check size={28} strokeWidth={2.4} /></span>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.02em", marginTop: 16 }}>{ativo ? "Está no ar" : editando ? "Alterações salvas" : "Automação salva"}</div>
      <div style={{ fontSize: 14, color: "var(--m-text-body)", lineHeight: 1.6, marginTop: 8 }}>
        A automação <b>{nome}</b> {ativo ? "já está valendo. O próximo comentário com a palavra-chave recebe a resposta e o direct. Não precisa fazer mais nada." : "foi salva desligada. Ligue quando quiser na lista de automações."}
      </div>
      <div className="flex justify-center flex-wrap" style={{ gap: 10, marginTop: 22 }}>
        <Link href="/app/fluxos" className="m-btn-2">Ver automações</Link>
        <Link href={`/app/automacao?avancado=1&editar=${id}`} className="m-btn-2"><Workflow size={15} /> Abrir no modo avançado</Link>
        {!editando && <button type="button" onClick={onOutra} className="m-btn">Criar outra</button>}
      </div>
    </div>
  );
}
