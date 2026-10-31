"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Trash2, Wand2, Workflow, X } from "lucide-react";
import type { DmFlow, FlowDTO } from "@/lib/flowTypes";
import { simplesDoFluxo } from "@/lib/modelos";
import { Card, Pill, Toggle, useConfirmar } from "../_ui/ui";

type Scope = "ALL_POSTS" | "SPECIFIC_POST";
type MatchType = "ANY" | "KEYWORD";
type DmMode = "simple" | "flow";

interface QRDraft {
  title: string;
  next: string; // id do passo ou "" (encerra)
}
interface StepDraft {
  id: string;
  text: string;
  quickReplies: QRDraft[];
}
interface Draft {
  id: string | null;
  name: string;
  enabled: boolean;
  scope: Scope;
  mediaId: string;
  matchType: MatchType;
  keywords: string;
  publicReplies: string;
  dmMode: DmMode;
  dmMessage: string;
  steps: StepDraft[];
}

function emptyDraft(): Draft {
  return { id: null, name: "", enabled: true, scope: "ALL_POSTS", mediaId: "", matchType: "KEYWORD", keywords: "", publicReplies: "", dmMode: "simple", dmMessage: "", steps: [] };
}

function stepsFromDmFlow(df: DmFlow): StepDraft[] {
  const ids = [df.entry, ...Object.keys(df.steps).filter((k) => k !== df.entry)];
  return ids
    .filter((id) => df.steps[id])
    .map((id) => ({
      id,
      text: df.steps[id].text ?? "",
      quickReplies: (df.steps[id].quickReplies ?? []).map((q) => ({ title: q.title, next: q.next ?? "" })),
    }));
}

function toDraft(f: FlowDTO): Draft {
  return {
    id: f.id,
    name: f.name,
    enabled: f.enabled,
    scope: f.scope,
    mediaId: f.mediaId ?? "",
    matchType: f.matchType,
    keywords: f.keywords.join("\n"),
    publicReplies: f.publicReplies.join("\n"),
    dmMode: f.dmFlow ? "flow" : "simple",
    dmMessage: f.dmMessage ?? "",
    steps: f.dmFlow ? stepsFromDmFlow(f.dmFlow) : [],
  };
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function newStepId(steps: StepDraft[]) {
  const ids = new Set(steps.map((s) => s.id));
  let n = 1;
  while (ids.has(`s${n}`)) n++;
  return `s${n}`;
}

const passoNome = (i: number) => (i === 0 ? "Início" : `Passo ${i + 1}`);

/**
 * MODO AVANÇADO: a conversa com quantos passos e botões quiser. Abre por
 * ?avancado=1 (nova) ou ?avancado=1&editar=id. Salva em /api/flows.
 */
export function EditorAvancado({ fluxo }: { fluxo: FlowDTO | null }) {
  const router = useRouter();
  const [confirmar, modalConfirmar] = useConfirmar();
  const [draft, setDraft] = useState<Draft>(() => (fluxo ? toDraft(fluxo) : emptyDraft()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cabeNoSimples = fluxo ? simplesDoFluxo(fluxo) !== null : true;

  function fechar() {
    router.push("/app/fluxos");
    router.refresh();
  }

  // --- passos do fluxo com botões ---
  const mudarPassos = (fn: (steps: StepDraft[]) => StepDraft[]) => setDraft((d) => ({ ...d, steps: fn(d.steps) }));
  const addStep = () => mudarPassos((s) => [...s, { id: newStepId(s), text: "", quickReplies: [] }]);
  const removeStep = (i: number) =>
    mudarPassos((s) => {
      const removido = s[i]?.id;
      // botões que apontavam para o passo removido passam a encerrar
      return s.filter((_, idx) => idx !== i).map((p) => ({ ...p, quickReplies: p.quickReplies.map((q) => (q.next === removido ? { ...q, next: "" } : q)) }));
    });
  const setStepText = (i: number, text: string) => mudarPassos((s) => s.map((p, idx) => (idx === i ? { ...p, text } : p)));
  const addQR = (i: number) => mudarPassos((s) => s.map((p, idx) => (idx === i ? { ...p, quickReplies: [...p.quickReplies, { title: "", next: "" }] } : p)));
  const setQR = (i: number, j: number, patch: Partial<QRDraft>) =>
    mudarPassos((s) => s.map((p, idx) => (idx === i ? { ...p, quickReplies: p.quickReplies.map((q, jdx) => (jdx === j ? { ...q, ...patch } : q)) } : p)));
  const removeQR = (i: number, j: number) => mudarPassos((s) => s.map((p, idx) => (idx === i ? { ...p, quickReplies: p.quickReplies.filter((_, jdx) => jdx !== j) } : p)));

  async function salvar() {
    if (!draft.name.trim()) return setError("Dê um nome à automação.");
    if (draft.matchType === "KEYWORD" && lines(draft.keywords).length === 0) return setError("Escreva ao menos uma palavra-chave.");
    if (draft.dmMode === "flow") {
      if (draft.steps.length === 0) return setError("Adicione ao menos um passo ao fluxo.");
      if (draft.steps.some((s) => !s.text.trim())) return setError("Cada passo precisa de um texto.");
    }
    setSaving(true);
    setError(null);

    const dmFlow =
      draft.dmMode === "flow" && draft.steps.length > 0
        ? {
            entry: draft.steps[0].id,
            steps: Object.fromEntries(
              draft.steps.map((s) => [
                s.id,
                { text: s.text, quickReplies: s.quickReplies.filter((q) => q.title.trim()).map((q) => ({ title: q.title.trim(), next: q.next || null })) },
              ]),
            ),
          }
        : null;

    const payload = {
      name: draft.name.trim(),
      enabled: draft.enabled,
      scope: draft.scope,
      mediaId: draft.scope === "SPECIFIC_POST" ? draft.mediaId.trim() || null : null,
      matchType: draft.matchType,
      keywords: draft.matchType === "KEYWORD" ? lines(draft.keywords) : [],
      publicReplies: lines(draft.publicReplies),
      dmMessage: draft.dmMode === "simple" ? draft.dmMessage.trim() || null : null,
      dmFlow,
    };

    try {
      const res = await fetch(draft.id ? `/api/flows/${draft.id}` : "/api/flows", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        setError(typeof b?.error === "string" ? b.error : "Não deu para salvar. Confira os campos e tente de novo.");
        return;
      }
      fechar();
    } catch {
      setError("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  async function excluir() {
    if (!draft.id) return;
    const ok = await confirmar({ titulo: `Excluir "${draft.name}"?`, texto: "A automação para de responder na hora. Isso não pode ser desfeito.", confirmar: "Excluir", perigo: true });
    if (!ok) return;
    const res = await fetch(`/api/flows/${draft.id}`, { method: "DELETE" });
    if (res.ok) fechar();
  }

  return (
    <div className="rise-in" style={{ marginTop: 18 }}>
      <div className="flex items-center m-simples-topo" style={{ gap: 12, marginBottom: 16 }}>
        <Link href="/app/fluxos" className="m-so-desktop" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>Automações</Link>
        <ChevronRight size={16} className="m-so-desktop" style={{ color: "var(--m-text-placeholder)" }} />
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{draft.id ? "Editar automação" : "Nova automação"}</span>
        <Pill tom="azul"><Workflow size={12} /> Modo avançado</Pill>
        {cabeNoSimples && (
          <Link href={draft.id ? `/app/automacao?editar=${draft.id}` : "/app/automacao"} className="m-btn-2 ml-auto" style={{ padding: "8px 13px", fontSize: 13 }}>
            <Wand2 size={15} /> <span className="m-so-desktop">Modo simples</span>
          </Link>
        )}
      </div>

        <div className="m-editor-grid" style={{ marginBottom: 20 }}>
          <Card>
            <div className="flex flex-col" style={{ gap: 18 }}>
              <div>
                <label className="m-label" htmlFor="af-nome">Nome da automação</label>
                <input id="af-nome" className="m-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Link do sorteio" />
              </div>

              <div className="grid m-grid-fixa" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14 }}>
                <div>
                  <label className="m-label" htmlFor="af-onde">Onde</label>
                  <select id="af-onde" className="m-select" style={{ width: "100%" }} value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as Scope })}>
                    <option value="ALL_POSTS">Todos os posts</option>
                    <option value="SPECIFIC_POST">Um post específico</option>
                  </select>
                </div>
                <div>
                  <label className="m-label" htmlFor="af-quando">Quando</label>
                  <select id="af-quando" className="m-select" style={{ width: "100%" }} value={draft.matchType} onChange={(e) => setDraft({ ...draft, matchType: e.target.value as MatchType })}>
                    <option value="KEYWORD">Comentar a palavra-chave</option>
                    <option value="ANY">Qualquer comentário</option>
                  </select>
                </div>
              </div>

              {draft.scope === "SPECIFIC_POST" && (
                <div>
                  <label className="m-label" htmlFor="af-post">ID do post</label>
                  <input id="af-post" className="m-input" value={draft.mediaId} onChange={(e) => setDraft({ ...draft, mediaId: e.target.value })} placeholder="ID do post no Instagram" />
                </div>
              )}

              {draft.matchType === "KEYWORD" && (
                <div>
                  <label className="m-label" htmlFor="af-palavras">Palavras-chave</label>
                  <textarea id="af-palavras" className="m-textarea" rows={3} value={draft.keywords} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} placeholder={"quero\neu quero\nlink"} />
                  <div className="m-hint">Uma por linha. Vale se o comentário contiver a palavra, sem diferenciar maiúsculas.</div>
                </div>
              )}

              <div>
                <label className="m-label" htmlFor="af-resposta">Resposta pública no comentário</label>
                <textarea id="af-resposta" className="m-textarea" rows={3} value={draft.publicReplies} onChange={(e) => setDraft({ ...draft, publicReplies: e.target.value })} placeholder={"Te mandei no direct! 💜\nOlha seu direct 👀"} />
                <div className="m-hint">Uma variação por linha: cada comentário recebe uma delas, para não parecer robô. Vazio = não responde no post.</div>
              </div>

              <div>
                <label className="m-label" htmlFor="af-direct">Mensagem no direct</label>
                <select id="af-direct" className="m-select" style={{ width: "100%" }} value={draft.dmMode} onChange={(e) => setDraft({ ...draft, dmMode: e.target.value as DmMode })}>
                  <option value="simple">Uma mensagem</option>
                  <option value="flow">Conversa com botões</option>
                </select>
              </div>

              {draft.dmMode === "simple" && (
                <div>
                  <textarea id="af-dm" aria-label="texto do direct" className="m-textarea" rows={3} value={draft.dmMessage} onChange={(e) => setDraft({ ...draft, dmMessage: e.target.value })} placeholder="Oi! Aqui está o link que você pediu: https://..." />
                  <div className="m-hint">Vazio = não manda direct.</div>
                </div>
              )}

              {draft.dmMode === "flow" && (
                <div className="flex flex-col" style={{ gap: 12 }}>
                  {draft.steps.map((s, i) => (
                    <div key={s.id} style={{ border: "1px solid var(--m-row-border)", borderRadius: 13, padding: 14, background: "var(--m-surface-subtle)" }}>
                      <div className="flex items-center" style={{ marginBottom: 10 }}>
                        <Pill tom={i === 0 ? "roxo" : "cinza"} dot>{passoNome(i)}</Pill>
                        <button type="button" onClick={() => removeStep(i)} className="ml-auto m-btn-danger" style={{ padding: "6px 10px", fontSize: 12 }}>
                          <Trash2 size={13} /> Remover passo
                        </button>
                      </div>
                      <textarea aria-label={`texto do ${passoNome(i)}`} className="m-textarea" rows={2} value={s.text} onChange={(e) => setStepText(i, e.target.value)} placeholder="Mensagem deste passo" />
                      <div className="flex flex-col" style={{ gap: 8, marginTop: 10 }}>
                        {s.quickReplies.map((q, j) => (
                          <div key={j} className="flex items-center" style={{ gap: 8 }}>
                            <input aria-label="texto do botão" className="m-input" style={{ height: 40 }} value={q.title} maxLength={20} onChange={(e) => setQR(i, j, { title: e.target.value })} placeholder="Texto do botão (até 20)" />
                            <select aria-label="para onde o botão leva" className="m-select" style={{ height: 40, minWidth: 140 }} value={q.next} onChange={(e) => setQR(i, j, { next: e.target.value })}>
                              <option value="">↳ Encerra</option>
                              {draft.steps.map((t, idx) => (
                                <option key={t.id} value={t.id}>↳ {passoNome(idx)}</option>
                              ))}
                            </select>
                            <button type="button" onClick={() => removeQR(i, j)} aria-label="remover botão" className="flex items-center justify-center cursor-pointer shrink-0" style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--m-danger-border)", background: "var(--m-danger-soft)", color: "var(--danger-text)" }}>
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addQR(i)} className="m-btn-2" style={{ alignSelf: "flex-start", padding: "8px 12px", fontSize: 12.5 }}>
                          <Plus size={14} /> Botão
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addStep} className="flex items-center justify-center cursor-pointer" style={{ gap: 8, border: "1px dashed var(--m-dashed)", background: "var(--m-dashed-bg)", borderRadius: 13, padding: 13, fontSize: 13.5, fontWeight: 700, color: "var(--text-muted)" }}>
                    <Plus size={17} style={{ color: "var(--accent)" }} /> Adicionar passo
                  </button>
                  <div className="m-hint" style={{ marginTop: 0 }}>O primeiro passo é o direct que chega quando a pessoa comenta. Cada botão leva a outro passo ou encerra a conversa.</div>
                </div>
              )}

              <div className="flex items-center" style={{ gap: 12 }}>
                <Toggle lg on={draft.enabled} onChange={(v) => setDraft({ ...draft, enabled: v })} rotulo="automação ativa" />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{draft.enabled ? "Ativa: responde assim que salvar" : "Pausada"}</span>
              </div>

              {error && <div role="alert" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--danger-text)" }}>{error}</div>}

              <div className="flex items-center" style={{ gap: 10 }}>
                <button type="button" className="m-btn" disabled={saving} onClick={salvar}>{saving ? "Salvando..." : draft.id ? "Salvar alterações" : "Criar automação"}</button>
                <button type="button" className="m-btn-2" disabled={saving} onClick={fechar}>Cancelar</button>
                {draft.id && (
                  <button type="button" className="m-btn-danger ml-auto" disabled={saving} onClick={excluir}>
                    <Trash2 size={14} /> Excluir
                  </button>
                )}
              </div>
            </div>
          </Card>

          <Previa d={draft} />
        </div>
      {modalConfirmar}
    </div>
  );
}

/** Como o seguidor vê: o comentário, a resposta no post e o direct. */
function Previa({ d }: { d: Draft }) {
  const palavra = d.matchType === "KEYWORD" ? (lines(d.keywords)[0] ?? "quero") : "Quero saber mais!";
  const resposta = lines(d.publicReplies)[0];
  const passo = d.dmMode === "flow" ? d.steps[0] : null;
  const dm = d.dmMode === "flow" ? passo?.text.trim() : d.dmMessage.trim();
  const botoes = passo ? passo.quickReplies.filter((q) => q.title.trim()).slice(0, 13) : [];
  const rotulo = { fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: "var(--m-text-faint)", marginTop: 16 } as const;
  return (
    <Card pad={18} style={{ position: "sticky", top: 8 }}>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>Prévia</span>
        <span className="ml-auto"><Pill tom="roxo">o que o seguidor vê</Pill></span>
      </div>
      <div style={rotulo}>COMENTÁRIO NO POST</div>
      <Bolha autor="@seguidor" texto={palavra} />
      {resposta && <Bolha autor="@suaconta" texto={resposta} sua />}
      <div style={rotulo}>DIRECT</div>
      {dm ? (
        <>
          <Bolha texto={dm} sua />
          {botoes.length > 0 && (
            <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
              {botoes.map((b, i) => (
                <span key={i} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)", border: "1px solid var(--m-selected-border)", borderRadius: 999, padding: "5px 11px", background: "var(--bg-card)" }}>{b.title}</span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--m-text-dim)", marginTop: 8 }}>Sem direct nesta automação.</div>
      )}
    </Card>
  );
}

function Bolha({ autor, texto, sua }: { autor?: string; texto: string; sua?: boolean }) {
  return (
    <div className="flex flex-col" style={{ alignItems: sua ? "flex-end" : "flex-start", marginTop: 8 }}>
      {autor && <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--m-text-dim)", marginBottom: 3 }}>{autor}</span>}
      <span className="m-pretty" style={{ maxWidth: "88%", fontSize: 13, lineHeight: 1.5, padding: "9px 12px", borderRadius: 14, background: sua ? "var(--accent-dim)" : "var(--m-surface-subtle)", border: `1px solid ${sua ? "var(--m-selected-border)" : "var(--border)"}`, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
        {texto}
      </span>
    </div>
  );
}
