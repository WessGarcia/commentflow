import { contatosEmCsv, listarContatos } from "@/lib/contatos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const csv = contatosEmCsv(await listarContatos());
  const hoje = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatos-commentflow-${hoje}.csv"`,
    },
  });
}
