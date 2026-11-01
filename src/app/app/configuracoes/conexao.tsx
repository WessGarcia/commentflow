"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Instagram } from "lucide-react";
import { Avatar, Pill, Vazio, useConfirmar } from "../_ui/ui";
import { quando } from "../_ui/fmt";

export type ContaDTO = { id: string; igUserId: string; username: string | null; conectada: boolean; desde: string };

/** Contas conectadas pelo login do Instagram, com o botão de desconectar. */
export function Contas({ contas }: { contas: ContaDTO[] }) {
  const router = useRouter();
  const [confirmar, modalConfirmar] = useConfirmar();
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function desconectar(c: ContaDTO) {
    const ok = await confirmar({ titulo: `Desconectar @${c.username ?? c.igUserId}?`, texto: "As automações param de responder nessa conta até você conectar de novo.", confirmar: "Desconectar", perigo: true });
    if (!ok) return;
    setOcupado(c.id);
    const r = await fetch(`/api/accounts/${c.id}`, { method: "DELETE" });
    setOcupado(null);
    if (r.ok) router.refresh();
  }

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {contas.length === 0 && <Vazio style={{ padding: "16px 8px" }}>Nenhuma conta conectada ainda.</Vazio>}
      {contas.map((c) => (
        <div key={c.id} className="flex items-center flex-wrap" style={{ gap: 12, border: "1px solid var(--m-row-border)", borderRadius: 13, padding: "12px 14px" }}>
          <Avatar nome={c.username ?? c.igUserId} size={40} ig />
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 14, fontWeight: 700 }}>@{c.username ?? c.igUserId}</div>
            <div style={{ fontSize: 12, color: "var(--m-text-dim)", marginTop: 2 }}>ID {c.igUserId} · desde {quando(c.desde, false)}</div>
          </div>
          <Pill tom={c.conectada ? "verde" : "vermelho"} dot>{c.conectada ? "Conectada" : "Sem acesso"}</Pill>
          <button type="button" className="m-btn-danger" disabled={ocupado === c.id} onClick={() => desconectar(c)}>
            {ocupado === c.id ? "..." : "Desconectar"}
          </button>
        </div>
      ))}
      <a href="/api/auth/meta/login" className="m-btn" style={{ alignSelf: "flex-start", marginTop: 4 }}>
        <Instagram size={17} /> {contas.length ? "Conectar outra conta" : "Conectar Instagram"}
      </a>
      {modalConfirmar}
    </div>
  );
}

/** Texto com botão de copiar (endereço do webhook). */
export function Copiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <code className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 12.5, background: "var(--m-surface-subtle)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>{texto}</code>
      <button
        type="button"
        className="m-btn-2"
        style={{ padding: "9px 12px", fontSize: 12.5 }}
        onClick={() => {
          navigator.clipboard?.writeText(texto).then(
            () => { setCopiado(true); setTimeout(() => setCopiado(false), 1800); },
            () => {},
          );
        }}
      >
        {copiado ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
      </button>
    </div>
  );
}
