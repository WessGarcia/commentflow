import { estadoDaInstalacao } from "@/lib/saude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Público de propósito: só "sim/não" e datas (nenhum segredo). O instalador consulta para saber o próximo passo. */
export async function GET() {
  const e = await estadoDaInstalacao();
  return Response.json(e, { status: e.ok ? 200 : 503 });
}
