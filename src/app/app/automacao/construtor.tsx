"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, ReactFlowProvider, applyNodeChanges, useReactFlow,
  type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronRight, ClipboardList, Clock, Flag, GitBranch, Lightbulb, Loader2, MessageCircle, MessageSquare, Plus, Shuffle, Tag, Trash2, Wand2, Workflow, X, Zap,
} from "lucide-react";
import type { FlowDTO } from "@/lib/flowTypes";
import { grafoDeAntigo, ligarSaida, minutosLegivel, novoNo, saidasDoNo, validarGrafo, asGrafo, type Grafo, type No, type NoDe } from "@/lib/grafo";
import { simplesDoFluxo } from "@/lib/modelos";
import { GATILHOS, TIPOS as TIPOS_GATILHO, tipoDe, type TipoGatilho } from "@/lib/gatilhos";
import { Pill, Toggle, useConfirmar } from "../_ui/ui";
import { SeletorPost } from "./seletor-post";

/**
 * O construtor visual (como na Mandei): paleta à esquerda, canvas com o
 * gatilho e os passos no meio, e o painel do passo selecionado à direita.
 * Liga-se um passo ao outro arrastando a bolinha de uma saída até o passo,
 * ou pelo seletor "vai para" do painel. Salva o grafo em /api/flows; o motor
 * (lib/motor.ts) é quem anda por ele quando alguém comenta.
 */

type Gatilho = { tipo: TipoGatilho; name: string; enabled: boolean; scope: "ALL_POSTS" | "SPECIFIC_POST"; mediaId: string; qualquer: boolean; palavras: string; publicas: string };
const ID_GATILHO = "__gatilho";

const TIPOS: { tipo: No["tipo"]; rotulo: string; sub: string; icone: typeof MessageSquare; cor: string }[] = [
  { tipo: "mensagem", rotulo: "Mensagem", sub: "Texto, imagem e botões", icone: MessageSquare, cor: "var(--accent)" },
  { tipo: "atraso", rotulo: "Espera", sub: "Aguarda e segue", icone: Clock, cor: "#f59e0b" },
  { tipo: "condicao", rotulo: "Condição", sub: "Clicou? Respondeu?", icone: GitBranch, cor: "#0ea5e9" },
  { tipo: "randomizador", rotulo: "Sorteio A/B", sub: "Divide por peso", icone: Shuffle, cor: "#ec4899" },
  { tipo: "acao", rotulo: "Etiqueta", sub: "Marca o contato", icone: Tag, cor: "#10b981" },
  { tipo: "coleta", rotulo: "Coletar dado", sub: "E-mail, telefone…", icone: ClipboardList, cor: "#6366f1" },
];
const infoDe = (t: No["tipo"]) => TIPOS.find((x) => x.tipo === t)!;

export function resumoCurto(n: No): string {
  switch (n.tipo) {
    case "mensagem": return n.texto.trim() ? n.texto.trim().slice(0, 60) : n.imagem_url ? "📷 Imagem" : "Mensagem vazia";
    case "atraso": return `Espera ${minutosLegivel(n.minutos)}`;
    case "condicao": return n.teste === "clicou" ? "Clicou no link?" : n.teste === "respondeu" ? "Respondeu?" : `Tem a etiqueta “${n.tag || "…"}”?`;
    case "randomizador": return `Sorteio: ${n.ramos.map((r) => `${r.rotulo || "?"} ${r.peso}%`).join(" · ")}`;
    case "acao": return `${n.acao === "adicionar_tag" ? "Põe" : "Tira"} a etiqueta “${n.tag}”`;
    case "coleta": return `Pede ${n.campo === "email" ? "o e-mail" : n.campo === "telefone" ? "o telefone" : "uma resposta"}`;
  }
}

function rotuloSaida(n: No, rotulo: string): string {
  const [t, i] = rotulo.split(":");
  if (n.tipo === "mensagem" && t === "rapida") return n.respostas_rapidas[Number(i)]?.titulo || "resposta";
  if (n.tipo === "mensagem" && t === "botao") return n.botoes[Number(i)]?.titulo || "botão";
  if (n.tipo === "randomizador" && t === "ramo") { const r = n.ramos[Number(i)]; return `${r?.rotulo || "?"} · ${r?.peso}%`; }
  if (t === "sim") return "sim";
  if (t === "nao") return "não";
  return n.tipo === "mensagem" ? "depois" : "segue";
}

// ------------------------------------------------------------ cartões do canvas

type DadosPasso = { no: No; inicio: boolean };
type DadosGatilho = { g: Gatilho };

function CartaoPasso({ data, selected }: NodeProps<Node<DadosPasso>>) {
  const { no, inicio } = data;
  const info = infoDe(no.tipo);
  const Icone = info.icone;
  const esperaToque = no.tipo === "mensagem" && (no.respostas_rapidas.length > 0 || no.botoes.some((b) => b.tipo === "proximo"));
  const saidas = saidasDoNo(no).filter((s) => !(esperaToque && s.rotulo === "proximo"));
  return (
    <div style={{ width: 230, background: "var(--bg-card)", border: `1.5px solid ${selected ? "var(--accent)" : "var(--m-row-border)"}`, borderRadius: 14, boxShadow: selected ? "0 0 0 4px var(--accent-dim)" : "var(--shadow-card)", fontFamily: "inherit" }}>
      <Handle type="target" position={Position.Left} id="entrada" style={{ width: 10, height: 10, background: "var(--m-text-placeholder)", border: "2px solid #fff" }} />
      <div className="flex items-center" style={{ gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--m-divider-soft)" }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 26, height: 26, borderRadius: 8, background: `color-mix(in srgb, ${info.cor} 14%, white)`, color: info.cor }}><Icone size={14} /></span>
        <span style={{ fontSize: 12.5, fontWeight: 800 }}>{info.rotulo}</span>
        {inicio && <span className="ml-auto" style={{ fontSize: 10, fontWeight: 800, color: "var(--accent)", background: "var(--m-tint)", borderRadius: 999, padding: "2px 7px" }}>1º PASSO</span>}
      </div>
      <div style={{ padding: "9px 12px", fontSize: 12, color: "var(--m-text-body)", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 74, overflow: "hidden" }}>{resumoCurto(no)}</div>
      {saidas.length > 0 && (
        <div style={{ borderTop: "1px solid var(--m-divider-soft)", padding: "4px 0" }}>
          {saidas.map((s) => (
            <div key={s.rotulo} className="relative flex items-center justify-end" style={{ padding: "4px 14px 4px 12px", fontSize: 11, fontWeight: 700, color: s.alvo ? "var(--m-neutral-text)" : "var(--m-text-faint)" }}>
              <span className="truncate">{rotuloSaida(no, s.rotulo)}</span>
              <Handle type="source" position={Position.Right} id={s.rotulo} style={{ width: 10, height: 10, right: -6, background: s.alvo ? "var(--accent)" : "#fff", border: "2px solid var(--accent)" }} />
            </div>
          ))}
        </div>
      )}
      {esperaToque && <div style={{ fontSize: 10.5, color: "var(--m-text-faint)", padding: "0 12px 8px" }}>espera o toque da pessoa</div>}
    </div>
  );
}

function CartaoGatilho({ data, selected }: NodeProps<Node<DadosGatilho>>) {
  const { g } = data;
  const palavras = g.palavras.split("\n").map((p) => p.trim()).filter(Boolean);
  return (
    <div style={{ width: 240, background: "var(--bg-card)", border: `1.5px solid ${selected ? "var(--accent)" : "var(--m-selected-border)"}`, borderRadius: 14, boxShadow: selected ? "0 0 0 4px var(--accent-dim)" : "var(--shadow-card)" }}>
      <div className="flex items-center" style={{ gap: 8, padding: "10px 12px", background: "var(--m-grad-brand)", color: "#fff", borderRadius: "12px 12px 0 0" }}>
        <Zap size={15} /> <span style={{ fontSize: 12.5, fontWeight: 800 }}>{GATILHOS[g.tipo].rotulo}</span>
      </div>
      <div style={{ padding: "10px 12px", fontSize: 12, lineHeight: 1.5, color: "var(--m-text-body)" }}>
        <div>{GATILHOS[g.tipo].palavras === "nenhuma" ? GATILHOS[g.tipo].descricao : g.qualquer ? "Qualquer texto" : palavras.length ? <>Palavras: <b>{palavras.slice(0, 4).join(", ")}</b></> : <span style={{ color: "var(--danger-text)" }}>Sem palavra-chave</span>}</div>
        {GATILHOS[g.tipo].post && <div style={{ color: "var(--m-text-dim)" }}>{g.scope === "SPECIFIC_POST" ? "Num post específico" : "Em todos os posts"}{g.publicas.trim() ? " · responde em público" : ""}</div>}
      </div>
      <Handle type="source" position={Position.Right} id="inicio" style={{ width: 10, height: 10, right: -6, background: "var(--accent)", border: "2px solid #fff" }} />
    </div>
  );
}

const nodeTypes = { passo: CartaoPasso, gatilho: CartaoGatilho };

// ------------------------------------------------------------ tela

export function Construtor({ fluxo }: { fluxo: FlowDTO | null }) {
  return (
    <ReactFlowProvider>
      <ConstrutorInterno fluxo={fluxo} />
    </ReactFlowProvider>
  );
}

function grafoInicial(fluxo: FlowDTO | null): Grafo {
  const salvo = fluxo ? asGrafo(fluxo.grafo) : null;
  if (salvo) return salvo;
  if (fluxo) return grafoDeAntigo(fluxo);
  return { inicio: "inicio", nos: [{ id: "inicio", tipo: "mensagem", pos: { x: 0, y: 0 }, texto: "Oi! Vi seu comentário. Quer que eu te mande o link aqui?", imagem_url: "", botoes: [], respostas_rapidas: [{ titulo: "Quero", proximo: null }], proximo: null }] };
}

function ConstrutorInterno({ fluxo }: { fluxo: FlowDTO | null }) {
  const router = useRouter();
  const rf = useReactFlow();
  const [confirmar, modalConfirmar] = useConfirmar();
  const [grafo, setGrafo] = useState<Grafo>(() => grafoInicial(fluxo));
  const [g, setG] = useState<Gatilho>(() => ({
    tipo: tipoDe(fluxo?.tipo), name: fluxo?.name ?? "", enabled: fluxo?.enabled ?? true, scope: fluxo?.scope ?? "ALL_POSTS", mediaId: fluxo?.mediaId ?? "",
    qualquer: fluxo?.matchType === "ANY", palavras: (fluxo?.keywords ?? []).join("\n"), publicas: (fluxo?.publicReplies ?? ["Te mandei no direct! 💜"]).join("\n"),
  }));
  const [posGatilho, setPosGatilho] = useState({ x: -330, y: 0 });
  // os nós do canvas vivem num estado que o próprio React Flow atualiza (medidas, arrasto);
  // o grafo é a verdade e é mesclado aqui sempre que muda
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [sel, setSel] = useState<string>(ID_GATILHO);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [salvo, setSalvo] = useState(false);
  const cabeNoSimples = fluxo ? simplesDoFluxo({ ...fluxo, grafo: null }) !== null && !fluxo.grafo : false;

  const mudarNo = useCallback((id: string, fn: (n: No) => No) => {
    setSalvo(false);
    setGrafo((gr) => ({ ...gr, nos: gr.nos.map((n) => (n.id === id ? fn(n) : n)) }));
  }, []);

  const derivados: Node[] = useMemo(() => [
    { id: ID_GATILHO, type: "gatilho", position: posGatilho, data: { g }, selected: sel === ID_GATILHO, deletable: false },
    ...grafo.nos.map((n) => ({ id: n.id, type: "passo", position: n.pos, data: { no: n, inicio: n.id === grafo.inicio }, selected: sel === n.id })),
  ], [grafo, g, posGatilho, sel]);

  useEffect(() => {
    setRfNodes((prev) => {
      const porId = new Map(prev.map((n) => [n.id, n]));
      return derivados.map((d) => { const p = porId.get(d.id); return p ? { ...p, position: d.position, data: d.data, selected: d.selected } : d; });
    });
  }, [derivados]);

  const edges: Edge[] = useMemo(() => {
    const seta = { type: MarkerType.ArrowClosed, color: "#7c3aed" } as const;
    const lista: Edge[] = [{ id: "e-gatilho", source: ID_GATILHO, sourceHandle: "inicio", target: grafo.inicio, markerEnd: seta, style: { stroke: "#7c3aed", strokeWidth: 2 }, deletable: false }];
    for (const n of grafo.nos) {
      for (const s of saidasDoNo(n)) {
        if (!s.alvo) continue;
        lista.push({ id: `e-${n.id}-${s.rotulo}`, source: n.id, sourceHandle: s.rotulo, target: s.alvo, markerEnd: seta, style: { stroke: "#7c3aed", strokeWidth: 1.8 }, type: "smoothstep" });
      }
    }
    return lista;
  }, [grafo]);

  const onNodesChange = useCallback((ch: NodeChange[]) => {
    setRfNodes((ns) => applyNodeChanges(ch.filter((c) => c.type !== "remove"), ns));
    for (const c of ch) {
      if (c.type === "position" && c.position) {
        if (c.id === ID_GATILHO) setPosGatilho(c.position);
        else mudarNo(c.id, (n) => ({ ...n, pos: c.position! }));
      }
      if (c.type === "select" && c.selected) setSel(c.id);
      if (c.type === "remove" && c.id !== ID_GATILHO) removerNo(c.id);
    }
  }, [mudarNo]);

  const onEdgesChange = useCallback((ch: EdgeChange[]) => {
    for (const c of ch) {
      if (c.type !== "remove" || c.id === "e-gatilho") continue;
      const e = edges.find((x) => x.id === c.id);
      if (e?.sourceHandle) mudarNo(e.source, (n) => ligarSaida(n, e.sourceHandle!, null));
    }
  }, [edges, mudarNo]);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.target === ID_GATILHO || c.source === c.target) return;
    if (c.source === ID_GATILHO) { setGrafo((gr) => ({ ...gr, inicio: c.target! })); setSalvo(false); return; }
    if (c.sourceHandle) mudarNo(c.source, (n) => ligarSaida(n, c.sourceHandle!, c.target));
  }, [mudarNo]);

  function adicionar(tipo: No["tipo"]) {
    const el = document.querySelector(".m-canvas");
    const r = el?.getBoundingClientRect();
    const pos = r ? rf.screenToFlowPosition({ x: r.left + r.width / 2 - 115, y: r.top + r.height / 2 - 60 }) : { x: 0, y: 0 };
    const novo = novoNo(tipo, { x: Math.round(pos.x + Math.random() * 40), y: Math.round(pos.y + Math.random() * 40) });
    setGrafo((gr) => {
      // liga o passo selecionado (se a saída "depois" dele estiver livre) ao novo
      const atual = gr.nos.find((n) => n.id === sel);
      const nos = gr.nos.map((n) => (atual && n.id === atual.id && "proximo" in n && !n.proximo ? (ligarSaida(n, "proximo", novo.id)) : n));
      return { ...gr, nos: [...nos, novo] };
    });
    setSel(novo.id);
    setSalvo(false);
  }

  function removerNo(id: string) {
    setGrafo((gr) => {
      if (gr.nos.length <= 1) return gr;
      const nos = gr.nos.filter((n) => n.id !== id).map((n) => saidasDoNo(n).reduce((acc, s) => (s.alvo === id ? ligarSaida(acc, s.rotulo, null) : acc), n));
      return { inicio: gr.inicio === id ? nos[0].id : gr.inicio, nos };
    });
    setSel(ID_GATILHO);
    setSalvo(false);
  }

  async function salvar() {
    const palavras = g.palavras.split("\n").map((p) => p.trim()).filter(Boolean);
    const problemas = [...validarGrafo(grafo, GATILHOS[g.tipo].respostaPrivada)];
    if (!g.name.trim()) problemas.unshift("Dê um nome à automação (clique no cartão “Quando alguém comentar”).");
    const tg = GATILHOS[g.tipo];
    const qualquer = tg.palavras === "nenhuma" || g.qualquer;
    if (!qualquer && !palavras.length) problemas.unshift("Escreva ao menos uma palavra-chave no cartão do gatilho.");
    if (tg.post && g.scope === "SPECIFIC_POST" && !g.mediaId.trim()) problemas.push("Toque no post (ou cole o ID) ou escolha todos os posts.");
    setErros(problemas);
    if (problemas.length) return;
    setSalvando(true);
    const payload = {
      name: g.name.trim(), tipo: g.tipo, enabled: g.enabled, scope: tg.post ? g.scope : "ALL_POSTS", mediaId: tg.post && g.scope === "SPECIFIC_POST" ? g.mediaId.trim() : null,
      matchType: qualquer ? "ANY" : "KEYWORD", keywords: qualquer ? [] : palavras,
      publicReplies: tg.publica ? g.publicas.split("\n").map((p) => p.trim()).filter(Boolean) : [], dmMessage: null, dmFlow: null, grafo,
    };
    try {
      const r = await fetch(fluxo ? `/api/flows/${fluxo.id}` : "/api/flows", { method: fluxo ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => null);
      if (!r.ok) { setErros([typeof j?.error === "string" ? j.error : "Não deu para salvar. Confira os passos."]); return; }
      setSalvo(true);
      if (!fluxo && j?.id) router.replace(`/app/automacao?avancado=1&editar=${j.id}`);
      else router.refresh();
    } catch {
      setErros(["Sem conexão com o servidor. Tente de novo."]);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!fluxo) return;
    const ok = await confirmar({ titulo: `Excluir “${fluxo.name}”?`, texto: "A automação para de responder na hora. Isso não pode ser desfeito.", confirmar: "Excluir", perigo: true });
    if (!ok) return;
    const r = await fetch(`/api/flows/${fluxo.id}`, { method: "DELETE" });
    if (r.ok) { router.push("/app/fluxos"); router.refresh(); }
  }

  const noSel = grafo.nos.find((n) => n.id === sel) ?? null;

  return (
    <div className="rise-in" style={{ marginTop: 14 }}>
      {modalConfirmar}
      <div className="flex items-center flex-wrap m-simples-topo" style={{ gap: 12, marginBottom: 12 }}>
        <Link href="/app/fluxos" className="m-so-desktop" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>Automações</Link>
        <ChevronRight size={16} className="m-so-desktop" style={{ color: "var(--m-text-placeholder)" }} />
        <span className="truncate" style={{ fontSize: 14.5, fontWeight: 700, maxWidth: 260 }}>{g.name.trim() || (fluxo ? "Editar automação" : "Nova automação")}</span>
        <Pill tom="azul"><Workflow size={12} /> Construtor</Pill>
        <div className="ml-auto flex items-center flex-wrap" style={{ gap: 10 }}>
          <span className="flex items-center" style={{ gap: 8, fontSize: 13, fontWeight: 600 }}>
            <Toggle on={g.enabled} onChange={(v) => { setG({ ...g, enabled: v }); setSalvo(false); }} rotulo="automação ligada" /> {g.enabled ? "Ligada" : "Desligada"}
          </span>
          {cabeNoSimples && fluxo && <Link href={`/app/automacao?editar=${fluxo.id}`} className="m-btn-2" style={{ padding: "8px 13px", fontSize: 13 }}><Wand2 size={15} /> Modo simples</Link>}
          {fluxo && <button type="button" onClick={excluir} className="m-btn-danger" style={{ padding: "8px 12px", fontSize: 13 }}><Trash2 size={14} /> Excluir</button>}
          <button type="button" onClick={salvar} disabled={salvando} className="m-btn" style={{ padding: "9px 16px", fontSize: 13.5 }}>
            {salvando ? <Loader2 size={15} className="animate-spin" /> : null} {salvo ? "Salvo ✓" : "Salvar alterações"}
          </button>
        </div>
      </div>

      {erros.length > 0 && (
        <div role="alert" style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 12, background: "var(--m-danger-bg)", color: "var(--danger-text)", fontSize: 13, lineHeight: 1.55 }}>
          {erros.map((e) => <div key={e}>• {e}</div>)}
        </div>
      )}

      <div className="m-construtor">
        <aside className="m-card m-construtor-paleta" style={{ padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>Adicionar passo</div>
          <div className="flex flex-col m-paleta-itens" style={{ gap: 6, marginTop: 10 }}>
            {TIPOS.map((t) => (
              <button key={t.tipo} type="button" onClick={() => adicionar(t.tipo)} className="m-row flex items-center text-left cursor-pointer" style={{ gap: 10, padding: "9px 10px", borderRadius: 11, border: "1px solid var(--m-row-border)", background: "var(--bg-card)", font: "inherit", color: "inherit" }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 9, background: `color-mix(in srgb, ${t.cor} 14%, white)`, color: t.cor }}><t.icone size={15} /></span>
                <span className="min-w-0">
                  <span className="block" style={{ fontSize: 13, fontWeight: 700 }}>{t.rotulo}</span>
                  <span className="block m-so-desktop" style={{ fontSize: 11, color: "var(--m-text-dim)" }}>{t.sub}</span>
                </span>
                <Plus size={14} className="ml-auto shrink-0" style={{ color: "var(--m-text-placeholder)" }} />
              </button>
            ))}
          </div>
          <div className="flex items-start m-so-desktop" style={{ gap: 8, marginTop: 14, padding: 11, borderRadius: 11, background: "var(--m-info-bg)", color: "var(--m-info-text)", fontSize: 11.5, lineHeight: 1.5 }}>
            <Lightbulb size={14} className="shrink-0" style={{ marginTop: 1 }} />
            <span>Arraste a bolinha roxa de uma saída até outro passo para ligar. Selecione uma ligação e aperte Delete para apagar.</span>
          </div>
        </aside>

        <div className="m-card m-canvas" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
          <ReactFlow
            nodes={rfNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneClick={() => setSel(ID_GATILHO)}
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
            minZoom={0.3}
            maxZoom={1.5}
            deleteKeyCode={["Delete", "Backspace"]}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#d6d9e4" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="m-so-desktop" style={{ width: 150, height: 100 }} />
          </ReactFlow>
        </div>

        <aside className="m-card m-construtor-painel" style={{ padding: 16 }}>
          {sel === ID_GATILHO || !noSel ? (
            <PainelGatilho g={g} onChange={(v) => { setG(v); setSalvo(false); }} />
          ) : (
            <PainelPasso
              key={noSel.id}
              no={noSel}
              inicio={noSel.id === grafo.inicio}
              outros={grafo.nos.filter((n) => n.id !== noSel.id)}
              onChange={(n) => mudarNo(noSel.id, () => n)}
              onInicio={() => { setGrafo((gr) => ({ ...gr, inicio: noSel.id })); setSalvo(false); }}
              onRemover={() => removerNo(noSel.id)}
              onFechar={() => setSel(ID_GATILHO)}
              podeRemover={grafo.nos.length > 1}
              respostaPrivada={GATILHOS[g.tipo].respostaPrivada}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ painéis

function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div className="m-label">{rotulo}</div>
      {children}
      {dica && <div className="m-hint">{dica}</div>}
    </div>
  );
}

function PainelGatilho({ g, onChange }: { g: Gatilho; onChange: (g: Gatilho) => void }) {
  return (
    <>
      <div className="flex items-center" style={{ gap: 8 }}>
        <Zap size={16} style={{ color: "var(--accent)" }} />
        <span style={{ fontSize: 15, fontWeight: 800 }}>Gatilho</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--m-text-dim)", marginTop: 3 }}>O que faz a automação começar.</div>
      <Campo rotulo="Nome da automação">
        <input className="m-input" value={g.name} onChange={(e) => onChange({ ...g, name: e.target.value })} placeholder="Ex.: Link do curso" maxLength={80} />
      </Campo>
      <Campo rotulo="Quando dispara" dica={GATILHOS[g.tipo].descricao}>
        <select className="m-select" style={{ width: "100%" }} value={g.tipo} onChange={(e) => onChange({ ...g, tipo: e.target.value as TipoGatilho })} aria-label="tipo de gatilho">
          {TIPOS_GATILHO.map((t) => <option key={t} value={t}>{GATILHOS[t].rotulo}</option>)}
        </select>
      </Campo>
      {GATILHOS[g.tipo].palavras !== "nenhuma" && (
      <Campo rotulo="Palavras-chave" dica="Uma por linha. Vale se o texto contiver a palavra.">
        {!g.qualquer && <textarea className="m-textarea" rows={3} value={g.palavras} onChange={(e) => onChange({ ...g, palavras: e.target.value })} placeholder={"quero\nlink"} />}
        <label className="flex items-center cursor-pointer" style={{ gap: 8, marginTop: 8, fontSize: 12.5 }}>
          <input type="checkbox" checked={g.qualquer} onChange={(e) => onChange({ ...g, qualquer: e.target.checked })} style={{ accentColor: "var(--accent)" }} /> {g.tipo === "story_resposta" ? "Qualquer resposta" : "Qualquer comentário"}
        </label>
      </Campo>
      )}
      {GATILHOS[g.tipo].post && (
      <Campo rotulo="Onde">
        <select className="m-select" style={{ width: "100%" }} value={g.scope} onChange={(e) => onChange({ ...g, scope: e.target.value as Gatilho["scope"] })} aria-label="onde">
          <option value="ALL_POSTS">Todos os posts</option>
          <option value="SPECIFIC_POST">Um post específico</option>
        </select>
        {g.scope === "SPECIFIC_POST" && <div style={{ marginTop: 8 }}><SeletorPost valor={g.mediaId} onChange={(id) => onChange({ ...g, mediaId: id })} /></div>}
      </Campo>
      )}
      {GATILHOS[g.tipo].publica && (
      <Campo rotulo="Resposta pública no comentário" dica="Uma por linha; cada comentário recebe uma delas. Vazio = não responde no post.">
        <textarea className="m-textarea" rows={3} value={g.publicas} onChange={(e) => onChange({ ...g, publicas: e.target.value })} />
      </Campo>
      )}
      {!GATILHOS[g.tipo].respostaPrivada && <div className="m-hint" style={{ marginTop: 12 }}>A pessoa já falou com você: a primeira mensagem vai direto, sem a regra do envio único da resposta a comentário.</div>}
    </>
  );
}

function VaiPara({ valor, outros, onChange, rotulo = "Vai para" }: { valor: string | null; outros: No[]; onChange: (v: string | null) => void; rotulo?: string }) {
  return (
    <select className="m-select" style={{ width: "100%", height: 38, fontSize: 12.5 }} value={valor ?? ""} onChange={(e) => onChange(e.target.value || null)} aria-label={rotulo}>
      <option value="">— termina aqui —</option>
      {outros.map((n) => <option key={n.id} value={n.id}>{infoDe(n.tipo).rotulo}: {resumoCurto(n).slice(0, 40)}</option>)}
    </select>
  );
}

function PainelPasso({ no, inicio, outros, onChange, onInicio, onRemover, onFechar, podeRemover, respostaPrivada }: {
  no: No; inicio: boolean; outros: No[]; onChange: (n: No) => void; onInicio: () => void; onRemover: () => void; onFechar: () => void; podeRemover: boolean; respostaPrivada: boolean;
}) {
  const info = infoDe(no.tipo);
  return (
    <>
      <div className="flex items-center" style={{ gap: 8 }}>
        <info.icone size={16} style={{ color: info.cor }} />
        <span style={{ fontSize: 15, fontWeight: 800 }}>{info.rotulo}</span>
        {inicio && <Pill tom="roxo"><Flag size={11} /> 1º passo</Pill>}
        <button type="button" onClick={onFechar} aria-label="fechar" className="ml-auto flex border-0 bg-transparent cursor-pointer" style={{ color: "var(--m-text-dim)" }}><X size={17} /></button>
      </div>

      {no.tipo === "mensagem" && <FormMensagem no={no} inicio={inicio} outros={outros} onChange={onChange} respostaPrivada={respostaPrivada} />}
      {no.tipo === "atraso" && <FormAtraso no={no} outros={outros} onChange={onChange} />}
      {no.tipo === "condicao" && (
        <>
          <Campo rotulo="Pergunta">
            <select className="m-select" style={{ width: "100%" }} value={no.teste} onChange={(e) => onChange({ ...no, teste: e.target.value as NoDe<"condicao">["teste"] })} aria-label="condição">
              <option value="clicou">Clicou no link?</option>
              <option value="respondeu">Respondeu no direct?</option>
              <option value="tem_tag">Tem a etiqueta…?</option>
            </select>
            {no.teste === "tem_tag" && <input className="m-input" style={{ marginTop: 8 }} value={no.tag} onChange={(e) => onChange({ ...no, tag: e.target.value })} placeholder="nome da etiqueta" maxLength={40} aria-label="etiqueta" />}
          </Campo>
          <Campo rotulo="Se sim"><VaiPara valor={no.sim} outros={outros} onChange={(v) => onChange({ ...no, sim: v })} rotulo="se sim" /></Campo>
          <Campo rotulo="Se não"><VaiPara valor={no.nao} outros={outros} onChange={(v) => onChange({ ...no, nao: v })} rotulo="se não" /></Campo>
          {no.teste === "clicou" && <div className="m-hint" style={{ marginTop: 10 }}>Conta os links que esta automação mandou. Ponha uma Espera antes, para dar tempo de a pessoa clicar.</div>}
        </>
      )}
      {no.tipo === "randomizador" && (
        <Campo rotulo="Ramos" dica="A pessoa cai num ramo sorteado pelo peso. Bom para testar duas mensagens.">
          <div className="flex flex-col" style={{ gap: 8 }}>
            {no.ramos.map((r, i) => (
              <div key={i} style={{ border: "1px solid var(--m-row-border)", borderRadius: 11, padding: 9 }}>
                <div className="flex items-center" style={{ gap: 6 }}>
                  <input className="m-input" style={{ height: 34, flex: 1 }} value={r.rotulo} maxLength={30} onChange={(e) => onChange({ ...no, ramos: no.ramos.map((x, j) => (j === i ? { ...x, rotulo: e.target.value } : x)) })} aria-label="nome do ramo" />
                  <input className="m-input" style={{ height: 34, width: 64 }} type="number" min={1} max={100} value={r.peso} onChange={(e) => onChange({ ...no, ramos: no.ramos.map((x, j) => (j === i ? { ...x, peso: Math.max(1, Math.min(100, Number(e.target.value) || 1)) } : x)) })} aria-label="peso" />
                  <span style={{ fontSize: 12 }}>%</span>
                  {no.ramos.length > 2 && <button type="button" onClick={() => onChange({ ...no, ramos: no.ramos.filter((_, j) => j !== i) })} aria-label="remover ramo" className="flex border-0 bg-transparent cursor-pointer" style={{ color: "var(--danger-text)" }}><X size={15} /></button>}
                </div>
                <div style={{ marginTop: 6 }}><VaiPara valor={r.proximo} outros={outros} onChange={(v) => onChange({ ...no, ramos: no.ramos.map((x, j) => (j === i ? { ...x, proximo: v } : x)) })} /></div>
              </div>
            ))}
            {no.ramos.length < 5 && <button type="button" onClick={() => onChange({ ...no, ramos: [...no.ramos, { rotulo: String.fromCharCode(65 + no.ramos.length), peso: 50, proximo: null }] })} className="m-btn-2" style={{ fontSize: 12.5, padding: "7px 10px" }}><Plus size={14} /> Ramo</button>}
          </div>
        </Campo>
      )}
      {no.tipo === "acao" && (
        <>
          <Campo rotulo="O que fazer">
            <select className="m-select" style={{ width: "100%" }} value={no.acao} onChange={(e) => onChange({ ...no, acao: e.target.value as NoDe<"acao">["acao"] })} aria-label="ação">
              <option value="adicionar_tag">Pôr a etiqueta</option>
              <option value="remover_tag">Tirar a etiqueta</option>
            </select>
            <input className="m-input" style={{ marginTop: 8 }} value={no.tag} onChange={(e) => onChange({ ...no, tag: e.target.value })} placeholder="interessado, cliente…" maxLength={40} aria-label="etiqueta" />
          </Campo>
          <Campo rotulo="Depois"><VaiPara valor={no.proximo} outros={outros} onChange={(v) => onChange({ ...no, proximo: v })} /></Campo>
        </>
      )}
      {no.tipo === "coleta" && (
        <>
          <Campo rotulo="O que guardar">
            <select className="m-select" style={{ width: "100%" }} value={no.campo} onChange={(e) => onChange({ ...no, campo: e.target.value as NoDe<"coleta">["campo"] })} aria-label="campo">
              <option value="email">E-mail (vai para a ficha do contato)</option>
              <option value="telefone">Telefone (vai para a ficha do contato)</option>
              <option value="texto">Texto livre (vai para as anotações)</option>
            </select>
          </Campo>
          <Campo rotulo="Pergunta"><textarea className="m-textarea" rows={2} value={no.pergunta} onChange={(e) => onChange({ ...no, pergunta: e.target.value })} maxLength={1000} /></Campo>
          <Campo rotulo="Se a resposta não servir"><input className="m-input" value={no.erro} onChange={(e) => onChange({ ...no, erro: e.target.value })} maxLength={300} /></Campo>
          <Campo rotulo="Depois de responder"><VaiPara valor={no.proximo} outros={outros} onChange={(v) => onChange({ ...no, proximo: v })} /></Campo>
        </>
      )}

      <div className="flex flex-col" style={{ gap: 8, marginTop: 18 }}>
        {!inicio && no.tipo === "mensagem" && <button type="button" onClick={onInicio} className="m-btn-2" style={{ fontSize: 12.5 }}><Flag size={14} /> Usar como 1º passo</button>}
        {podeRemover && <button type="button" onClick={onRemover} className="m-btn-danger" style={{ fontSize: 12.5 }}><Trash2 size={14} /> Apagar passo</button>}
      </div>
    </>
  );
}

function FormAtraso({ no, outros, onChange }: { no: NoDe<"atraso">; outros: No[]; onChange: (n: No) => void }) {
  const unidade = no.minutos % 1440 === 0 ? 1440 : no.minutos % 60 === 0 ? 60 : 1;
  return (
    <>
      <Campo rotulo="Esperar" dica="A conversa fica aberta 24 h depois da última mensagem da pessoa: esperas maiores podem não conseguir mandar.">
        <div className="flex" style={{ gap: 8 }}>
          <input className="m-input" type="number" min={1} value={no.minutos / unidade} onChange={(e) => onChange({ ...no, minutos: Math.max(1, Math.min(20160, (Number(e.target.value) || 1) * unidade)) })} aria-label="quanto tempo" style={{ width: 100 }} />
          <select className="m-select" value={unidade} onChange={(e) => onChange({ ...no, minutos: Math.max(1, Math.min(20160, (no.minutos / unidade) * Number(e.target.value))) })} aria-label="unidade">
            <option value={1}>minutos</option>
            <option value={60}>horas</option>
            <option value={1440}>dias</option>
          </select>
        </div>
      </Campo>
      <Campo rotulo="Depois"><VaiPara valor={no.proximo} outros={outros} onChange={(v) => onChange({ ...no, proximo: v })} /></Campo>
    </>
  );
}

function FormMensagem({ no, inicio, outros, onChange, respostaPrivada }: { no: NoDe<"mensagem">; inicio: boolean; outros: No[]; onChange: (n: No) => void; respostaPrivada: boolean }) {
  const esperaToque = no.respostas_rapidas.length > 0 || no.botoes.some((b) => b.tipo === "proximo");
  return (
    <>
      {inicio && respostaPrivada && (
        <div className="flex items-start" style={{ gap: 8, marginTop: 12, padding: "9px 11px", borderRadius: 10, background: "var(--m-info-bg)", color: "var(--m-info-text)", fontSize: 11.5, lineHeight: 1.5 }}>
          <MessageCircle size={14} className="shrink-0" style={{ marginTop: 1 }} />
          <span>Esta é a resposta privada ao comentário: vai num envio só, e o próximo passo só sai depois que a pessoa tocar num botão ou responder (regra da Meta).</span>
        </div>
      )}
      <Campo rotulo="Texto" dica={no.botoes.length ? (no.imagem_url.trim() ? `Com imagem e botões, o texto vira o título do cartão: ${no.texto.trim().length}/80.` : `Os botões aparecem dentro do balão, embaixo do texto: ${no.texto.trim().length}/640.`) : undefined}>
        <textarea className="m-textarea" rows={4} value={no.texto} onChange={(e) => onChange({ ...no, texto: e.target.value })} maxLength={1000} placeholder="Oi! Aqui está o link: https://…" />
      </Campo>
      <Campo rotulo="Imagem (opcional)" dica="Link público de uma imagem (https://…). Os links do texto e dos botões são rastreados.">
        <input className="m-input" value={no.imagem_url} onChange={(e) => onChange({ ...no, imagem_url: e.target.value })} placeholder="https://…/imagem.jpg" />
      </Campo>

      <Campo rotulo={`Botões (${no.botoes.length}/3)`} dica="Abrem um link ou levam a outro passo. Não dá para misturar com respostas rápidas.">
        <div className="flex flex-col" style={{ gap: 8 }}>
          {no.botoes.map((b, i) => (
            <div key={i} style={{ border: "1px solid var(--m-row-border)", borderRadius: 11, padding: 9 }}>
              <div className="flex items-center" style={{ gap: 6 }}>
                <input className="m-input" style={{ height: 34, flex: 1 }} value={b.titulo} maxLength={20} onChange={(e) => onChange({ ...no, botoes: no.botoes.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)) })} placeholder="Texto do botão" aria-label="texto do botão" />
                <select className="m-select" style={{ height: 34, fontSize: 12 }} value={b.tipo} onChange={(e) => onChange({ ...no, botoes: no.botoes.map((x, j) => (j === i ? { ...x, tipo: e.target.value as "url" | "proximo" } : x)) })} aria-label="tipo do botão">
                  <option value="url">Link</option>
                  <option value="proximo">Passo</option>
                </select>
                <button type="button" onClick={() => onChange({ ...no, botoes: no.botoes.filter((_, j) => j !== i) })} aria-label="remover botão" className="flex border-0 bg-transparent cursor-pointer" style={{ color: "var(--danger-text)" }}><X size={15} /></button>
              </div>
              <div style={{ marginTop: 6 }}>
                {b.tipo === "url"
                  ? <input className="m-input" style={{ height: 34 }} value={b.url} onChange={(e) => onChange({ ...no, botoes: no.botoes.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} placeholder="https://…" aria-label="link do botão" />
                  : <VaiPara valor={b.proximo} outros={outros} onChange={(v) => onChange({ ...no, botoes: no.botoes.map((x, j) => (j === i ? { ...x, proximo: v } : x)) })} />}
              </div>
            </div>
          ))}
          {no.botoes.length < 3 && !no.respostas_rapidas.length && (
            <button type="button" onClick={() => onChange({ ...no, botoes: [...no.botoes, { titulo: "Acessar", tipo: "url", url: "", proximo: null }] })} className="m-btn-2" style={{ fontSize: 12.5, padding: "7px 10px" }}><Plus size={14} /> Botão</button>
          )}
        </div>
      </Campo>

      <Campo rotulo={`Respostas rápidas (${no.respostas_rapidas.length}/13)`} dica="Opções que a pessoa toca embaixo da mensagem. O toque abre a conversa.">
        <div className="flex flex-col" style={{ gap: 8 }}>
          {no.respostas_rapidas.map((r, i) => (
            <div key={i} className="flex items-center" style={{ gap: 6 }}>
              <input className="m-input" style={{ height: 34, width: 110 }} value={r.titulo} maxLength={20} onChange={(e) => onChange({ ...no, respostas_rapidas: no.respostas_rapidas.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)) })} aria-label="texto da resposta rápida" />
              <div className="flex-1 min-w-0"><VaiPara valor={r.proximo} outros={outros} onChange={(v) => onChange({ ...no, respostas_rapidas: no.respostas_rapidas.map((x, j) => (j === i ? { ...x, proximo: v } : x)) })} /></div>
              <button type="button" onClick={() => onChange({ ...no, respostas_rapidas: no.respostas_rapidas.filter((_, j) => j !== i) })} aria-label="remover resposta rápida" className="flex border-0 bg-transparent cursor-pointer" style={{ color: "var(--danger-text)" }}><X size={15} /></button>
            </div>
          ))}
          {no.respostas_rapidas.length < 13 && !no.botoes.length && (
            <button type="button" onClick={() => onChange({ ...no, respostas_rapidas: [...no.respostas_rapidas, { titulo: "Quero", proximo: null }] })} className="m-btn-2" style={{ fontSize: 12.5, padding: "7px 10px" }}><Plus size={14} /> Resposta rápida</button>
          )}
        </div>
      </Campo>

      {!esperaToque && <Campo rotulo="Depois desta mensagem"><VaiPara valor={no.proximo} outros={outros} onChange={(v) => onChange({ ...no, proximo: v })} /></Campo>}
    </>
  );
}
