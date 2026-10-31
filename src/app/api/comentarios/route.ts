import type { NextRequest } from "next/server";
import { z } from "zod";
import { agirNoComentario, listarComentarios, metricasComentarios } from "@/lib/comentarios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const itens = await listarComentarios();
  return Response.json({ itens, metricas: metricasComentarios(itens) });
}

const acaoSchema = z.object({ comentario: z.string().min(1) }).and(
  z.discriminatedUnion("acao", [
    z.object({ acao: z.literal("responder"), texto: z.string().trim().min(1).max(2200) }),
    z.object({ acao: z.literal("dm"), texto: z.string().trim().min(1).max(1000) }),
    z.object({ acao: z.literal("ocultar") }),
    z.object({ acao: z.literal("mostrar") }),
    z.object({ acao: z.literal("aplicar"), flowId: z.string().min(1) }),
    z.object({ acao: z.literal("status"), resolvido: z.boolean() }),
  ]),
);

/** Responder, mandar direct, ocultar, aplicar automação ou mudar o status de um comentário. */
export async function POST(req: NextRequest) {
  const parsed = acaoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pedido inválido." }, { status: 400 });
  const { comentario, ...acao } = parsed.data;
  const r = await agirNoComentario(comentario, acao);
  return r.ok ? Response.json({ ok: true, aviso: r.aviso }) : Response.json({ error: r.erro }, { status: 400 });
}
