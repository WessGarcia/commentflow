"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { AbasLinha, Avatar, Busca, Card, Paginacao, Pill, Vazio } from "../_ui/ui";
import { quando } from "../_ui/fmt";
import { STATUS_PILL, type StatusComentario } from "../inicio-parts";

export type ComentarioLinha = { id: string; username: string; texto: string; mediaId: string | null; em: string; status: StatusComentario; fluxo: string | null };

const POR_PAGINA = 12;

/** Todos os comentários que chegaram, com o que a automação fez em cada um. */
export function ListaComentarios({ itens, qInicial }: { itens: ComentarioLinha[]; qInicial: string }) {
  const [aba, setAba] = useState("todos");
  const [q, setQ] = useState(qInicial);
  const [pagina, setPagina] = useState(1);

  const contagem = {
    todos: itens.length,
    respondidos: itens.filter((c) => c.status === "respondido").length,
    sem: itens.filter((c) => c.status === "sem_automacao").length,
    erro: itens.filter((c) => c.status === "erro").length,
  };
  const lista = useMemo(() => {
    let l = itens.filter((c) => (aba === "respondidos" ? c.status === "respondido" : aba === "sem" ? c.status === "sem_automacao" : aba === "erro" ? c.status === "erro" : true));
    if (q) l = l.filter((c) => (c.texto + " " + c.username + " " + (c.fluxo ?? "")).toLowerCase().includes(q.toLowerCase()));
    return l;
  }, [itens, aba, q]);
  const pag = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <AbasLinha
          itens={[
            { v: "todos", r: "Todos", n: contagem.todos },
            { v: "respondidos", r: "Respondidos", n: contagem.respondidos },
            { v: "sem", r: "Sem automação", n: contagem.sem },
            { v: "erro", r: "Com erro", n: contagem.erro },
          ]}
          ativo={aba}
          onChange={(v) => { setAba(v); setPagina(1); }}
        />
      </div>

      <Card pad={0} className="overflow-hidden">
        <div style={{ padding: 14 }}>
          <Busca placeholder="Buscar por texto, @ ou automação..." value={q} onChange={(v) => { setQ(v); setPagina(1); }} suave />
        </div>
        {pag.length === 0 && <Vazio>{itens.length ? "Nada nesse filtro." : "Nenhum comentário chegou ainda. Quando alguém comentar num post seu, aparece aqui."}</Vazio>}
        {pag.map((c) => (
          <div key={c.id} className="m-row flex items-start" style={{ gap: 12, padding: "14px 18px", borderTop: "1px solid var(--m-divider-soft)" }}>
            <Avatar nome={c.username || "alguém"} size={38} ig />
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{c.username ? `@${c.username}` : "alguém"}</span>
                <span style={{ fontSize: 12, color: "var(--m-text-faint)" }}>{quando(c.em)}</span>
              </div>
              <div style={{ fontSize: 13.5, color: "var(--m-text-body)", lineHeight: 1.5, marginTop: 3 }}>{c.texto || "(sem texto)"}</div>
              {c.fluxo && <div style={{ fontSize: 12, color: "var(--m-text-dim)", marginTop: 5 }}>Automação: <span style={{ fontWeight: 700, color: "var(--accent)" }}>{c.fluxo}</span></div>}
            </div>
            <div className="flex flex-col items-end shrink-0" style={{ gap: 8 }}>
              <Pill tom={STATUS_PILL[c.status].tom} dot>{STATUS_PILL[c.status].r}</Pill>
              {c.username && (
                <a href={`https://www.instagram.com/${c.username}/`} target="_blank" rel="noreferrer" className="inline-flex items-center" style={{ gap: 5, fontSize: 12, fontWeight: 700 }}>
                  Ver perfil <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        ))}
        <Paginacao total={lista.length} porPagina={POR_PAGINA} pagina={pagina} onChange={setPagina} rotulo="comentários" />
      </Card>
    </>
  );
}
