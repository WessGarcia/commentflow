import { headers } from "next/headers";
import { env } from "@/lib/env";
import { estadoDaInstalacao } from "@/lib/saude";
import { BancoFora } from "../_ui/banco-fora";
import { PageHeader } from "../_ui/ui";
import { Assistente } from "./assistente";

export const dynamic = "force-dynamic";

/** Assistente "Ligar a Meta": do zero ao Instagram conectado, com os endereços desta instalação. */
export default async function LigarMetaPage({ searchParams }: { searchParams: Promise<{ falta?: string }> }) {
  const sp = await searchParams;
  const estado = await estadoDaInstalacao();
  if (!estado.banco) return <BancoFora />;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <div className="rise-in" style={{ maxWidth: 860 }}>
      <PageHeader titulo="Ligar a Meta" sub="Siga as etapas na ordem. O que é no site da Meta você clica lá; o resto se faz aqui." />
      <Assistente estado={estado} origem={`${proto}://${host}`} token={env.igVerifyToken} faltaApp={sp.falta === "app"} />
    </div>
  );
}
