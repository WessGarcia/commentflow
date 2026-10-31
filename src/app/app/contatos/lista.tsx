"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ExternalLink, Mail, MessageSquare, Phone, Plus, Send, X } from "lucide-react";
import type { ContatoLinha } from "@/lib/contatos";
import { COLUNAS } from "@/lib/quadro";
import { Avatar, Busca, Card, Paginacao, Pill, Vazio } from "../_ui/ui";
import { fmt, quando } from "../_ui/fmt";

const POR_PAGINA = 12;
export const nomeDe = (c: { nome: string | null; username: string | null; igsid: string }) => c.nome || (c.username ? `@${c.username}` : `Contato ${c.igsid.slice(-4)}`);
const TOM_ETAPA: Record<string, "cinza" | "roxo" | "azul" | "verde" | "ambar"> = Object.fromEntries(COLUNAS.map((c) => [c.id, c.tom]));
const nomeEtapa = (id: string) => COLUNAS.find((c) => c.id === id)?.nome ?? id;

/** A lista de contatos com filtros e, ao lado, a ficha de quem está selecionado. */
export function ListaContatos({ contatos, inicial }: { contatos: ContatoLinha[]; inicial?: string }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [etapa, setEtapa] = useState("");
  const [status, setStatus] = useState("");
  const [pagina, setPagina] = useState(1);
  const [sel, setSel] = useState<string | null>(inicial ?? null);

  const tags = useMemo(() => Array.from(new Set(contatos.flatMap((c) => c.tags))).sort(), [contatos]);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return contatos.filter(
      (c) =>
        (!t || `${c.nome ?? ""} ${c.username ?? ""} ${c.email ?? ""} ${c.telefone ?? ""}`.toLowerCase().includes(t)) &&
        (!tag || c.tags.includes(tag)) &&
        (!etapa || c.etapa === etapa) &&
        (!status || c.status === status),
    );
  }, [contatos, q, tag, etapa, status]);
  const pag = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const atual = contatos.find((c) => c.id === sel) ?? null;
  const filtrar = (f: () => void) => { f(); setPagina(1); };

  return (
    <div className="m-contatos" style={{ display: "grid", gridTemplateColumns: atual ? "minmax(0,1fr) 340px" : "minmax(0,1fr)", gap: 18, alignItems: "start" }}>
      <div className="min-w-0">
        <div className="flex items-center flex-wrap" style={{ gap: 10, marginBottom: 14 }}>
          <Busca placeholder="Buscar por nome, @, e-mail ou telefone" value={q} onChange={(v) => filtrar(() => setQ(v))} altura={44} style={{ flex: "1 1 240px" }} />
          <select className="m-select" value={etapa} onChange={(e) => filtrar(() => setEtapa(e.target.value))} aria-label="etapa">
            <option value="">Todas as etapas</option>
            {COLUNAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select className="m-select" value={tag} onChange={(e) => filtrar(() => setTag(e.target.value))} aria-label="etiqueta">
            <option value="">Todas as etiquetas</option>
            {tags.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <select className="m-select" value={status} onChange={(e) => filtrar(() => setStatus(e.target.value))} aria-label="status">
            <option value="">Todos os status</option>
            <option value="atendimento">Em atendimento</option>
            <option value="resolvida">Resolvida</option>
          </select>
        </div>

        <Card pad={0} className="overflow-hidden">
          {pag.length === 0 && <Vazio>{contatos.length ? "Ninguém nesse filtro." : "Ninguém ainda. Cada pessoa que comentar num post seu ou mandar direct entra aqui."}</Vazio>}
          {pag.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSel(c.id === sel ? null : c.id)}
              className={`w-full text-left flex items-center flex-wrap cursor-pointer ${c.id === sel ? "" : "m-row"}`}
              style={{ gap: 13, padding: "13px 18px", border: 0, borderTop: i ? "1px solid var(--m-divider-soft)" : "none", background: c.id === sel ? "var(--m-panel)" : "transparent", boxShadow: c.id === sel ? "inset 3px 0 0 var(--accent)" : "none", font: "inherit", color: "inherit" }}
            >
              <Avatar nome={nomeDe(c)} size={40} ig />
              <div className="flex-1 min-w-0" style={{ minWidth: 160 }}>
                <div className="truncate" style={{ fontSize: 14, fontWeight: 700 }}>{nomeDe(c)}</div>
                <div className="truncate" style={{ fontSize: 12.5, color: "var(--m-text-dim)", marginTop: 2 }}>
                  {c.username && c.nome ? `@${c.username} · ` : ""}{c.ultimoComentario ? `“${c.ultimoComentario}”` : c.email || "—"}
                </div>
              </div>
              <div className="flex items-center flex-wrap justify-end" style={{ gap: 6 }}>
                {c.tags.slice(0, 2).map((t) => <Pill key={t} tom="cinza">{t.replace(/_/g, " ")}</Pill>)}
                <Pill tom={TOM_ETAPA[c.etapa]} dot>{nomeEtapa(c.etapa)}</Pill>
                <span style={{ fontSize: 12, color: "var(--m-text-faint)", minWidth: 70, textAlign: "right" }}>{c.ultimo ? quando(c.ultimo, false) : "—"}</span>
              </div>
            </button>
          ))}
          <Paginacao total={lista.length} porPagina={POR_PAGINA} pagina={pagina} onChange={setPagina} rotulo={lista.length === 1 ? "contato" : "contatos"} />
        </Card>
      </div>

      {atual && <Ficha key={atual.id} c={atual} onFechar={() => setSel(null)} />}
    </div>
  );
}

/** A ficha: dados que você anota, etiquetas e atalhos. Salva em /api/conversas/[id]. */
function Ficha({ c, onFechar }: { c: ContatoLinha; onFechar: () => void }) {
  const router = useRouter();
  const [dados, setDados] = useState({ nome: c.nome ?? "", email: c.email ?? "", telefone: c.telefone ?? "", notas: c.notas ?? "" });
  const [novaTag, setNovaTag] = useState("");
  const [salvo, setSalvo] = useState<"" | "salvando" | "salvo" | "erro">("");

  async function acao(corpo: Record<string, unknown>) {
    const r = await fetch(`/api/conversas/${c.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
    if (r.ok) router.refresh();
    return r.ok;
  }
  async function salvar() {
    setSalvo("salvando");
    const ok = await acao({ acao: "dados", nome: dados.nome.trim() || null, email: dados.email.trim() || null, telefone: dados.telefone.trim() || null, notas: dados.notas.trim() || null });
    setSalvo(ok ? "salvo" : "erro");
  }

  return (
    <Card pad={18} className="m-ficha" style={{ position: "sticky", top: 8 }}>
      <div className="flex items-center">
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>Ficha do contato</span>
        <button type="button" onClick={onFechar} aria-label="fechar" className="ml-auto flex border-0 bg-transparent cursor-pointer" style={{ color: "var(--m-text-dim)" }}><X size={18} /></button>
      </div>
      <div className="flex items-center gap-3" style={{ marginTop: 14 }}>
        <Avatar nome={nomeDe(c)} size={46} ig />
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 14.5, fontWeight: 700 }}>{nomeDe(c)}</div>
          {c.username && <a href={`https://www.instagram.com/${c.username}/`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{ fontSize: 12.5, fontWeight: 700 }}>{c.nome ? `@${c.username}` : "Ver perfil"} <ExternalLink size={11} /></a>}
        </div>
      </div>

      <div className="grid text-center" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 14, padding: "12px 0", borderTop: "1px solid var(--m-divider)", borderBottom: "1px solid var(--m-divider)" }}>
        <Stat v={fmt(c.comentarios)} r="Comentários" icone={<MessageSquare size={13} />} />
        <Stat v={c.recebeu ? "sim" : "não"} r="Recebeu direct" icone={<Send size={13} />} />
        <Stat v={c.respondeu ? "sim" : "não"} r="Respondeu" icone={<MessageSquare size={13} />} />
      </div>

      <div className="flex flex-col" style={{ gap: 10, marginTop: 14 }}>
        <Campo icone={<Mail size={14} />} rotulo="Nome"><input className="m-input" style={{ height: 38 }} value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} placeholder="Como você chama essa pessoa" maxLength={120} /></Campo>
        <Campo icone={<Mail size={14} />} rotulo="E-mail"><input className="m-input" style={{ height: 38 }} type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} placeholder="sem e-mail" maxLength={200} /></Campo>
        <Campo icone={<Phone size={14} />} rotulo="Telefone"><input className="m-input" style={{ height: 38 }} value={dados.telefone} onChange={(e) => setDados({ ...dados, telefone: e.target.value })} placeholder="sem telefone" maxLength={40} /></Campo>
        <Campo icone={<Calendar size={14} />} rotulo="Anotações"><textarea className="m-textarea" rows={3} value={dados.notas} onChange={(e) => setDados({ ...dados, notas: e.target.value })} placeholder="O que ela quer, o que você combinou…" maxLength={4000} /></Campo>
        <div className="flex items-center" style={{ gap: 10 }}>
          <button type="button" className="m-btn" style={{ padding: "9px 16px", fontSize: 13 }} disabled={salvo === "salvando"} onClick={salvar}>{salvo === "salvando" ? "Salvando..." : "Salvar"}</button>
          {salvo === "salvo" && <span style={{ fontSize: 12.5, color: "var(--success-text)", fontWeight: 600 }}>Salvo</span>}
          {salvo === "erro" && <span style={{ fontSize: 12.5, color: "var(--danger-text)", fontWeight: 600 }}>Não salvou. Confira o e-mail.</span>}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>Etiquetas</div>
        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
          {c.tags.map((t) => (
            <Pill key={t} tom="roxo" dot>
              {t.replace(/_/g, " ")}
              <button type="button" onClick={() => acao({ acao: "tag", tag: t, remover: true })} aria-label={`tirar etiqueta ${t}`} className="border-0 bg-transparent cursor-pointer flex p-0" style={{ color: "inherit", opacity: 0.7 }}><X size={11} /></button>
            </Pill>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (novaTag.trim()) acao({ acao: "tag", tag: novaTag.trim() }).then(() => setNovaTag("")); }} className="inline-flex items-center" style={{ gap: 4 }}>
            <input value={novaTag} onChange={(e) => setNovaTag(e.target.value)} placeholder="nova etiqueta" aria-label="nova etiqueta" className="m-input" style={{ height: 30, width: 130, fontSize: 12.5 }} maxLength={40} />
            <button type="submit" aria-label="adicionar etiqueta" className="flex items-center justify-center cursor-pointer" style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--bg-card)", color: "var(--accent)" }}><Plus size={14} /></button>
          </form>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>Etapa no quadro</div>
        <select className="m-select" style={{ width: "100%", marginTop: 8 }} value={c.manual ? c.etapa : ""} onChange={(e) => acao({ acao: "etapa", etapa: e.target.value || null })} aria-label="etapa no quadro">
          <option value="">Automática ({nomeEtapa(c.etapa)})</option>
          {COLUNAS.filter((o) => !o.derivada).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>

      <div className="flex flex-col" style={{ gap: 8, marginTop: 16 }}>
        <Link href={`/app/conversas?contato=${c.id}`} className="m-btn-2" style={{ fontSize: 13 }}><MessageSquare size={15} /> Abrir conversa</Link>
        <div style={{ fontSize: 11.5, color: "var(--m-text-faint)", textAlign: "center" }}>Contato desde {quando(c.desde, false)}</div>
      </div>
    </Card>
  );
}

function Campo({ rotulo, icone, children }: { rotulo: string; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center" style={{ gap: 5, fontSize: 12, fontWeight: 700, color: "var(--m-neutral-text)", marginBottom: 4 }}>
        <span className="flex" style={{ color: "var(--m-text-dim)" }}>{icone}</span>{rotulo}
      </span>
      {children}
    </label>
  );
}

function Stat({ v, r, icone }: { v: string; r: string; icone: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-center" style={{ gap: 4, fontSize: 14.5, fontWeight: 800 }}><span className="flex" style={{ color: "var(--accent)" }}>{icone}</span>{v}</div>
      <div style={{ fontSize: 11, color: "var(--m-text-dim)" }}>{r}</div>
    </div>
  );
}
