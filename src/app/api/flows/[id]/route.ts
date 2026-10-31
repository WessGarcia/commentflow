import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { flowPatchSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const flow = await prisma.flow.findUnique({ where: { id } });
  if (!flow) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(flow);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = flowPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const d = parsed.data;
  try {
    const flow = await prisma.flow.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.tipo !== undefined ? { tipo: d.tipo } : {}),
        ...(d.enabled !== undefined ? { enabled: d.enabled } : {}),
        ...(d.scope !== undefined ? { scope: d.scope } : {}),
        ...(d.mediaId !== undefined ? { mediaId: d.mediaId ?? null } : {}),
        ...(d.matchType !== undefined ? { matchType: d.matchType } : {}),
        ...(d.keywords !== undefined ? { keywords: d.keywords } : {}),
        ...(d.publicReplies !== undefined
          ? { publicReplies: d.publicReplies }
          : {}),
        ...(d.dmMessage !== undefined ? { dmMessage: d.dmMessage ?? null } : {}),
        ...(d.dmFlow !== undefined
          ? {
              dmFlow: d.dmFlow
                ? (d.dmFlow as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            }
          : {}),
        ...(d.grafo !== undefined
          ? { grafo: d.grafo ? (d.grafo as Prisma.InputJsonValue) : Prisma.JsonNull }
          : {}),
      },
    });
    return Response.json(flow);
  } catch {
    return Response.json({ error: "not found" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    await prisma.flow.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "not found" }, { status: 404 });
  }
}
