"use client";

import { useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { GUIA_URL } from "@/lib/ajuda";
import { Card, PageHeader } from "../_ui/ui";
import { ConteudoAjuda } from "../_ui/ajuda";

/** A Central de ajuda em página inteira (a gaveta do "?" usa as mesmas peças). */
export default function AjudaPage() {
  const [q, setQ] = useState("");
  const [artigo, setArtigo] = useState<string | null>(null);
  return (
    <div className="rise-in">
      <PageHeader titulo="Central de ajuda" sub="Respostas rápidas para usar o CommentFlow.">
        <a href={GUIA_URL} target="_blank" rel="noreferrer" className="m-btn-2"><BookOpen size={16} /> Guia completo</a>
      </PageHeader>
      <Card>
        <label className="flex items-center" style={{ gap: 11, height: 48, padding: "0 15px", marginBottom: 20, background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 13 }}>
          <Search size={18} style={{ color: "var(--m-text-placeholder)" }} />
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setArtigo(null); }} placeholder="Buscar na ajuda..." aria-label="Buscar na ajuda" className="flex-1 min-w-0 border-0 bg-transparent" style={{ fontSize: 14, outline: "none" }} />
        </label>
        <ConteudoAjuda q={q} artigo={artigo} setArtigo={setArtigo} />
      </Card>
    </div>
  );
}
