import type { NextRequest } from "next/server";
import { z } from "zod";
import { listarNotificacoes, marcarLidas } from "@/lib/notificacoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const porPagina = Math.min(100, Math.max(1, Number(sp.get("porPagina")) || 20));
  const pagina = Math.max(1, Number(sp.get("pagina")) || 1);
  return Response.json(await listarNotificacoes(porPagina, pagina));
}

const corpo = z.union([z.object({ id: z.string().min(1) }), z.object({ todas: z.literal(true) })]);

/** Marca uma notificação (ou todas) como lida. */
export async function POST(req: NextRequest) {
  const parsed = corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pedido inválido." }, { status: 400 });
  await marcarLidas(parsed.data);
  return Response.json({ ok: true });
}
