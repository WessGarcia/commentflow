import { listarConversas } from "@/lib/conversas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ itens: await listarConversas() });
  } catch {
    return Response.json({ error: "Banco indisponível." }, { status: 503 });
  }
}
