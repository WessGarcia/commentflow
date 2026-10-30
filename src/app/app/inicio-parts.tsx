"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, ChevronDown, Lightbulb } from "lucide-react";
import { Abas, Avatar, Busca, Dica, Pill, Vazio } from "./_ui/ui";
import { quandoCurto } from "./_ui/fmt";

/** As partes do Início que precisam de estado no navegador. */

export type StatusComentario = "respondido" | "erro" | "sem_automacao" | "pendente";
export type ComentarioItem = { id: string; username: string; texto: string; em: string; status: StatusComentario };

export const STATUS_PILL: Record<StatusComentario, { tom: "verde" | "vermelho" | "cinza" | "ambar"; r: string }> = {
  respondido: { tom: "verde", r: "Respondido" },
  erro: { tom: "vermelho", r: "Com erro" },
  sem_automacao: { tom: "cinza", r: "Sem automação" },
  pendente: { tom: "ambar", r: "Na fila" },
};

export function ComentariosRecentes({ itens }: { itens: ComentarioItem[] }) {
  const [aba, setAba] = useState("todos");
  const [q, setQ] = useState("");
  const respondidos = itens.filter((i) => i.status === "respondido").length;
  const filtradas = itens.filter((i) => {
    if (aba === "respondidos" && i.status !== "respondido") return false;
    if (aba === "sem" && i.status === "respondido") return false;
    if (q && !(i.username + " " + i.texto).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <>
      <Busca placeholder="Buscar comentários..." value={q} onChange={setQ} suave style={{ marginTop: 14 }} />
      <div style={{ marginTop: 12 }}>
        <Abas
          itens={[
            { v: "todos", r: "Todos" },
            { v: "respondidos", r: "Respondidos", n: respondidos },
            { v: "sem", r: "Sem resposta" },
          ]}
          ativo={aba}
          onChange={setAba}
        />
      </div>
      <div className="flex flex-col" style={{ marginTop: 6 }}>
        {filtradas.length === 0 && (
          <Vazio>{itens.length === 0 ? "Nenhum comentário ainda. Quando alguém comentar num post seu, aparece aqui." : "Nada nesse filtro."}</Vazio>
        )}
        {filtradas.map((c) => (
          <Link key={c.id} href={`/app/comentarios?q=${encodeURIComponent(c.username || c.texto.slice(0, 30))}`} className="m-row flex items-center" style={{ gap: 12, padding: "11px 6px", borderRadius: 12, color: "inherit" }}>
            <Avatar nome={c.username || "alguém"} size={40} ig />
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 14, fontWeight: 700 }}>{c.username ? `@${c.username}` : "alguém"}</div>
              <div className="truncate" style={{ fontSize: 13, color: "var(--m-text-dim)", marginTop: 2 }}>{c.texto || "(sem texto)"}</div>
            </div>
            <div className="flex flex-col items-end shrink-0" style={{ gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--m-text-faint)", fontWeight: 600 }}>{quandoCurto(c.em)}</span>
              <Pill tom={STATUS_PILL[c.status].tom}>{STATUS_PILL[c.status].r}</Pill>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

/** "Últimos 7 dias": troca o período pela URL, então o servidor recalcula tudo. */
export function FiltroPeriodo({ valor }: { valor: number }) {
  const router = useRouter();
  return (
    <label className="relative inline-flex items-center cursor-pointer" style={{ gap: 9, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", fontSize: 13.5, fontWeight: 600, boxShadow: "var(--shadow-card)" }}>
      <Calendar size={17} style={{ color: "var(--accent)" }} strokeWidth={1.8} />
      <select
        id="periodo"
        value={valor}
        onChange={(e) => router.push(`/app?periodo=${e.target.value}`)}
        className="appearance-none bg-transparent border-0 cursor-pointer pr-5"
        style={{ fontSize: 13.5, fontWeight: 600, outline: "none" }}
        aria-label="período"
      >
        <option value={7}>Últimos 7 dias</option>
        <option value={30}>Últimos 30 dias</option>
        <option value={90}>Últimos 90 dias</option>
      </select>
      <ChevronDown size={16} className="absolute pointer-events-none" style={{ right: 12, color: "var(--m-text-dim)" }} />
    </label>
  );
}

/** A dica some quando fechada, e fica fechada nesse navegador. */
export function DicaInicio() {
  const [visivel, setVisivel] = useState(true);
  useEffect(() => {
    try { if (localStorage.getItem("painel.dica.inicio") === "fechada") setVisivel(false); } catch {}
  }, []);
  if (!visivel) return null;
  return (
    <Dica
      titulo="Dica do CommentFlow"
      icone={<Lightbulb size={18} strokeWidth={1.8} />}
      href="/app/palavras-chave"
      link="Ver palavras-chave"
      onFechar={() => {
        setVisivel(false);
        try { localStorage.setItem("painel.dica.inicio", "fechada"); } catch {}
      }}
    >
      Peça na legenda para comentarem uma palavra-chave. Quem comentar recebe a resposta e o direct na hora.
    </Dica>
  );
}
