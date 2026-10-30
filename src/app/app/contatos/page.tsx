import { MessageCircle, Send, Users } from "lucide-react";
import { getContatos } from "@/lib/painel";
import { BancoFora } from "../_ui/banco-fora";
import { Avatar, Card, Metrica, PageHeader, Pill, Vazio } from "../_ui/ui";
import { fmt, quando } from "../_ui/fmt";

export const dynamic = "force-dynamic";

/** Quem comentou nos seus posts, quantas vezes e se já recebeu o direct. */
export default async function ContatosPage() {
  const contatos = await getContatos().catch(() => null);
  if (!contatos) return <BancoFora />;
  const comDm = contatos.filter((c) => c.recebeuDm).length;
  const recorrentes = contatos.filter((c) => c.comentarios > 1).length;

  return (
    <div className="rise-in">
      <PageHeader titulo="Contatos" sub="Quem comentou nos seus posts. Sem cobrança por contato: a lista pode crescer à vontade." />

      <div className="grid m-metricas" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 18, marginBottom: 20 }}>
        <Metrica variante="horizontal" rotulo="Contatos" valor={fmt(contatos.length)} icone={<Users size={20} strokeWidth={1.8} />} />
        <Metrica variante="horizontal" tom="verde" rotulo="Receberam direct" valor={fmt(comDm)} icone={<Send size={20} strokeWidth={1.8} />} />
        <Metrica variante="horizontal" tom="azul" rotulo="Comentaram mais de uma vez" valor={fmt(recorrentes)} icone={<MessageCircle size={20} strokeWidth={1.8} />} />
      </div>

      <Card pad={0} className="overflow-hidden">
        {contatos.length === 0 && <Vazio>Ninguém comentou ainda. Cada pessoa que comentar num post seu entra aqui.</Vazio>}
        {contatos.map((c, i) => (
          <div key={c.id} className="m-row flex items-center flex-wrap" style={{ gap: 13, padding: "14px 18px", borderTop: i ? "1px solid var(--m-divider-soft)" : "none" }}>
            <Avatar nome={c.username || "alguém"} size={40} ig />
            <div className="flex-1 min-w-0" style={{ minWidth: 180 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{c.username ? `@${c.username}` : "alguém"}</div>
              <div className="truncate" style={{ fontSize: 12.5, color: "var(--m-text-dim)", marginTop: 2 }}>{c.ultimoTexto || "—"}</div>
            </div>
            <div className="flex flex-col items-end shrink-0" style={{ gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--m-text-faint)" }}>
                {fmt(c.comentarios)} comentário{c.comentarios === 1 ? "" : "s"} · {quando(c.ultimo, false)}
              </span>
              <Pill tom={c.recebeuDm ? "verde" : "cinza"} dot>{c.recebeuDm ? "Recebeu direct" : "Só comentou"}</Pill>
            </div>
            {c.username && (
              <a href={`https://www.instagram.com/${c.username}/`} target="_blank" rel="noreferrer" className="m-btn-2" style={{ padding: "8px 12px", fontSize: 12.5 }}>
                Perfil
              </a>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
