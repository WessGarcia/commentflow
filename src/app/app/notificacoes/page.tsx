"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import type { Notificacao } from "@/lib/notificacoes";
import { Card, PageHeader, Paginacao } from "../_ui/ui";
import { ListaNotificacoes } from "../_ui/notificacoes";

const POR_PAGINA = 20;

/** Todas as notificações, com paginação (a gaveta do sino mostra só as 20 últimas). */
export default function NotificacoesPage() {
  const router = useRouter();
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<{ itens: Notificacao[]; total: number; naoLidas: number } | null>(null);

  useEffect(() => {
    fetch(`/api/notificacoes?porPagina=${POR_PAGINA}&pagina=${pagina}`, { cache: "no-store" }).then((r) => r.json()).then(setDados).catch(() => setDados({ itens: [], total: 0, naoLidas: 0 }));
  }, [pagina]);

  const abrir = (n: Notificacao) => {
    if (!n.lida) fetch("/api/notificacoes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: n.id }) }).catch(() => {});
    if (n.link) router.push(n.link);
  };
  const lerTodas = async () => {
    await fetch("/api/notificacoes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ todas: true }) }).catch(() => {});
    setDados((d) => (d ? { ...d, naoLidas: 0, itens: d.itens.map((n) => ({ ...n, lida: true })) } : d));
  };

  return (
    <div className="rise-in">
      <PageHeader titulo="Notificações" sub="Tudo que mereceu um aviso na sua conta.">
        {dados && dados.naoLidas > 0 && <button type="button" onClick={lerTodas} className="m-btn-2"><CheckCheck size={16} /> Marcar todas como lidas</button>}
      </PageHeader>
      <Card>
        <ListaNotificacoes itens={dados?.itens ?? null} onAbrir={abrir} />
        {dados && dados.total > POR_PAGINA && <Paginacao total={dados.total} porPagina={POR_PAGINA} pagina={pagina} onChange={setPagina} rotulo="notificações" />}
      </Card>
    </div>
  );
}
