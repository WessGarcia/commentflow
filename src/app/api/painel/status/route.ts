import { getStatus } from "@/lib/painel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O que a casca do painel precisa saber: conta conectada e automações ligadas.
export async function GET() {
  try {
    return Response.json(await getStatus());
  } catch {
    return Response.json({ conta: null, conectada: false, fluxosAtivos: 0, banco: false }, { status: 503 });
  }
}
