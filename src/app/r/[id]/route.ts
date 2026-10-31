import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Link rastreado do construtor: conta o clique, marca o contato com a
 * etiqueta "clicou_link" e manda a pessoa para o endereço de verdade.
 * Público de propósito (quem clica é o seguidor, sem senha do painel).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.clique.findUnique({ where: { id } }).catch(() => null);
  if (!c || !/^https?:\/\//i.test(c.url)) return new Response("Link não encontrado.", { status: 404 });

  await prisma.clique.update({ where: { id }, data: { cliques: { increment: 1 }, primeiroEm: c.primeiroEm ?? new Date() } }).catch(() => undefined);
  if (c.igsid) {
    const contato = await prisma.contact.findUnique({ where: { igsid: c.igsid }, select: { id: true, tags: true } });
    if (contato && !contato.tags.includes("clicou_link")) await prisma.contact.update({ where: { id: contato.id }, data: { tags: [...contato.tags, "clicou_link"] } }).catch(() => undefined);
  }
  return new Response(null, { status: 302, headers: { Location: c.url, "Cache-Control": "no-store" } });
}
