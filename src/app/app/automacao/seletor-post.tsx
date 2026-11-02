"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { Publicacao } from "@/lib/meta";

/**
 * As publicações recentes da conta para tocar e escolher; o ID escolhido é o
 * mesmo valor que antes se colava à mão (e ainda dá para colar, embaixo).
 */
export function SeletorPost({ valor, onChange }: { valor: string; onChange: (id: string) => void }) {
  const [itens, setItens] = useState<Publicacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/publicacoes")
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { itens?: Publicacao[]; error?: string };
        if (j.itens) setItens(j.itens);
        else setErro(j.error ?? "Não deu para buscar suas publicações agora.");
      })
      .catch(() => setErro("Sem conexão com o servidor. Tente de novo."));
  }, []);

  const id = valor.trim();
  return (
    <div>
      {!itens && !erro && (
        <div className="m-hint flex items-center" style={{ gap: 6, marginTop: 0 }}><Loader2 size={14} className="animate-spin" /> Buscando suas publicações…</div>
      )}
      {erro && <div role="alert" style={{ fontSize: 12.5, color: "var(--danger-text)", background: "var(--m-danger-bg)", border: "1px solid var(--m-danger-border)", borderRadius: 10, padding: "8px 12px" }}>{erro}</div>}
      {itens?.length === 0 && <div className="m-hint" style={{ marginTop: 0 }}>Nenhuma publicação encontrada nesta conta ainda. Publique o post e volte aqui.</div>}
      {!!itens?.length && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(116px, 1fr))", gap: 8, maxHeight: 340, overflowY: "auto", padding: 2 }}>
          {itens.map((p) => {
            const ativa = p.id === id;
            return (
              <button key={p.id} type="button" onClick={() => onChange(p.id)} aria-pressed={ativa} className="text-left cursor-pointer" style={{ position: "relative", padding: 0, borderRadius: 11, overflow: "hidden", border: `2px solid ${ativa ? "var(--accent)" : "var(--m-row-border)"}`, background: "var(--bg-card)", font: "inherit", color: "inherit" }}>
                {p.imagem
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.imagem} alt="" loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                  : <span className="block" style={{ width: "100%", aspectRatio: "1", background: "var(--m-surface)" }} />}
                {p.reels && <span style={{ position: "absolute", top: 6, left: 6, fontSize: 10.5, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "rgba(0,0,0,.6)", color: "#fff" }}>Reels</span>}
                {ativa && <span className="flex items-center justify-center" style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 99, background: "var(--accent)", color: "#fff" }}><Check size={14} /></span>}
                <span className="block" style={{ padding: "6px 8px" }}>
                  <span className="block truncate" style={{ fontSize: 11.5, fontWeight: 600 }}>{p.legenda || "Sem legenda"}</span>
                  {p.quando && <span className="block" style={{ fontSize: 10.5, color: "var(--m-text-dim)" }}>{new Date(p.quando).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <input className="m-input" style={{ marginTop: 10 }} value={id} onChange={(e) => onChange(e.target.value)} placeholder="Ou cole o ID do post aqui" aria-label="ID do post" />
      <div className="m-hint">Não achou o post na lista? Cole o ID dele: aparece em Comentários, em cada comentário recebido daquele post.</div>
    </div>
  );
}
