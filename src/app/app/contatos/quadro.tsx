"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GripVertical, Loader2, MessageSquare, RotateCcw, Send } from "lucide-react";
import type { ContatoLinha } from "@/lib/contatos";
import { COLUNAS, etapaDoContato, type EtapaId } from "@/lib/quadro";
import { Avatar, Busca, Pill } from "../_ui/ui";
import { quandoCurto } from "../_ui/fmt";
import { nomeDe } from "./lista";

/**
 * O quadro (como na Mandei): os contatos em colunas, arrastáveis. Arrasto é
 * HTML5 puro; no celular, arrastar não funciona bem, então cada cartão tem os
 * botões de mover.
 */

const TOM: Record<string, { fundo: string; texto: string }> = {
  roxo: { fundo: "var(--m-tint)", texto: "var(--accent)" },
  azul: { fundo: "var(--m-info-bg)", texto: "var(--m-info-text)" },
  verde: { fundo: "var(--m-success-bg)", texto: "var(--success-text)" },
  ambar: { fundo: "var(--m-warning-bg)", texto: "var(--m-gold)" },
  cinza: { fundo: "var(--m-neutral-bg)", texto: "var(--m-neutral-text)" },
};

export function Quadro({ inicial }: { inicial: ContatoLinha[] }) {
  const [cards, setCards] = useState(inicial);
  const [q, setQ] = useState("");
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<EtapaId | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? cards.filter((c) => `${c.username ?? ""} ${c.nome ?? ""} ${c.tags.join(" ")}`.toLowerCase().includes(t)) : cards;
  }, [cards, q]);

  async function mover(card: ContatoLinha, etapa: EtapaId | null) {
    if (card.etapa === etapa) return;
    setSalvando(card.id);
    setErro(null);
    // otimista: o cartão anda na hora e volta se o servidor recusar
    const antes = cards;
    const novaEtapa = etapa ?? etapaDoContato({ recebeu: card.recebeu, respondeu: card.respondeu, etapa: null });
    setCards((l) => l.map((c) => (c.id === card.id ? { ...c, etapa: novaEtapa, manual: etapa != null } : c)));
    const r = await fetch(`/api/conversas/${card.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao: "etapa", etapa }) });
    setSalvando(null);
    if (!r.ok) { setCards(antes); setErro("Não deu para mover. Tente de novo."); }
  }

  return (
    <>
      <div className="flex items-center" style={{ gap: 12, marginBottom: 14 }}>
        <Busca value={q} onChange={setQ} placeholder="Buscar por @, nome ou etiqueta" altura={44} style={{ flex: "0 1 420px" }} />
      </div>
      {erro && <div role="alert" style={{ marginBottom: 12, padding: "10px 13px", borderRadius: 11, background: "var(--m-danger-bg)", color: "var(--danger-text)", fontSize: 12.5 }}>{erro}</div>}

      <div className="m-quadro">
        {COLUNAS.map((col) => {
          const doCol = filtrados.filter((c) => c.etapa === col.id);
          const t = TOM[col.tom];
          const alvo = sobre === col.id;
          return (
            <div
              key={col.id}
              onDragOver={(e) => { if (arrastando) { e.preventDefault(); setSobre(col.id); } }}
              onDragLeave={() => setSobre((s) => (s === col.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setSobre(null);
                const card = cards.find((c) => c.id === arrastando);
                setArrastando(null);
                if (card) mover(card, col.id);
              }}
              className="flex flex-col"
              style={{ borderRadius: 14, background: alvo ? "var(--m-surface)" : "transparent", border: `1.5px ${alvo ? "solid" : "dashed"} ${alvo ? "var(--accent)" : "var(--m-row-border)"}`, padding: 10, minHeight: 200, transition: "background .12s" }}
            >
              <div className="flex items-center" style={{ gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.texto }} />
                <span style={{ fontSize: 13, fontWeight: 800 }}>{col.nome}</span>
                <span className="ml-auto" style={{ fontSize: 12, fontWeight: 700, color: "var(--m-text-dim)", background: t.fundo, borderRadius: 999, padding: "1px 8px" }}>{doCol.length}</span>
              </div>
              <div className="m-pretty" style={{ fontSize: 11.5, color: "var(--m-text-dim)", lineHeight: 1.4, marginTop: 4, minHeight: 32 }}>{col.dica}</div>

              <div className="flex flex-col" style={{ gap: 8, marginTop: 8 }}>
                {doCol.map((c) => (
                  <article
                    key={c.id}
                    draggable
                    onDragStart={() => setArrastando(c.id)}
                    onDragEnd={() => { setArrastando(null); setSobre(null); }}
                    style={{ background: "var(--bg-card)", border: "1px solid var(--m-row-border)", borderRadius: 12, padding: 10, cursor: "grab", opacity: salvando === c.id ? 0.55 : 1 }}
                  >
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <GripVertical size={13} style={{ color: "var(--m-text-placeholder)" }} className="shrink-0 m-so-desktop" />
                      <Avatar nome={nomeDe(c)} size={26} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate" style={{ fontSize: 12.8, fontWeight: 700 }}>{nomeDe(c)}</div>
                        <div className="truncate" style={{ fontSize: 11, color: "var(--m-text-dim)" }}>{c.username && c.nome ? `@${c.username} · ` : ""}{quandoCurto(c.ultimo)}</div>
                      </div>
                      {salvando === c.id && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: "var(--accent)" }} />}
                    </div>

                    <div className="flex items-center flex-wrap" style={{ gap: 5, marginTop: 8 }}>
                      {c.comentarios > 0 && <Marca icone={<MessageSquare size={10} />}>{c.comentarios} coment.</Marca>}
                      {c.recebeu && <Marca icone={<Send size={10} />} tom="roxo">direct</Marca>}
                      {c.respondeu && <Marca icone={<MessageSquare size={10} />} tom="azul">respondeu</Marca>}
                      {c.email && <Marca>e-mail</Marca>}
                    </div>

                    {c.tags.length > 0 && (
                      <div className="flex flex-wrap" style={{ gap: 4, marginTop: 6 }}>
                        {c.tags.slice(0, 3).map((t2) => <Pill key={t2} tom="cinza">{t2.replace(/_/g, " ")}</Pill>)}
                      </div>
                    )}

                    <div className="flex items-center" style={{ gap: 6, marginTop: 8 }}>
                      <Link href={`/app/conversas?contato=${c.id}`} style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)" }}>Abrir conversa</Link>
                      {c.manual && (
                        <button type="button" title="voltar para o automático" aria-label="voltar para o automático" onClick={() => mover(c, null)} className="ml-auto border-0 bg-transparent cursor-pointer flex" style={{ color: "var(--m-text-dim)" }}><RotateCcw size={12} /></button>
                      )}
                    </div>

                    <div className="m-so-mobile flex flex-wrap" style={{ gap: 5, marginTop: 8 }}>
                      {COLUNAS.filter((o) => o.id !== col.id && !o.derivada).map((o) => (
                        <button key={o.id} type="button" onClick={() => mover(c, o.id)} className="cursor-pointer" style={{ border: "1px solid var(--m-row-border)", background: "transparent", borderRadius: 999, padding: "3px 8px", fontSize: 11, color: "var(--m-text-body)", font: "inherit" }}>
                          → {o.nome}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
                {doCol.length === 0 && (
                  <div className="text-center" style={{ fontSize: 11.5, color: "var(--m-text-placeholder)", padding: "14px 6px" }}>
                    {col.derivada ? "Ninguém aqui ainda." : "Arraste quem chegou nesse ponto."}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="m-hint" style={{ marginTop: 14 }}>
        As três primeiras colunas andam sozinhas conforme a pessoa age. <b>Virou cliente</b> e <b>Não rolou</b> são suas: o CommentFlow vê mensagem, não vê venda.
      </div>
    </>
  );
}

function Marca({ children, icone, tom = "cinza" }: { children: React.ReactNode; icone?: React.ReactNode; tom?: "cinza" | "azul" | "roxo" }) {
  const t = TOM[tom];
  return (
    <span className="inline-flex items-center" style={{ gap: 3, background: t.fundo, color: t.texto, borderRadius: 999, padding: "2px 7px", fontSize: 10.5, fontWeight: 700 }}>
      {icone}{children}
    </span>
  );
}
