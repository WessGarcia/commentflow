import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { detalheConversa, enviarPeloPainel } from "@/lib/conversas";
import { ETAPAS, type EtapaId } from "@/lib/quadro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const d = await detalheConversa(id);
  if (!d) return Response.json({ error: "Conversa não encontrada." }, { status: 404 });
  return Response.json(d);
}

const acaoSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("enviar"), texto: z.string().trim().min(1).max(1000) }),
  z.object({ acao: z.literal("tag"), tag: z.string().trim().min(1).max(40), remover: z.boolean().optional() }),
  z.object({ acao: z.literal("status"), status: z.enum(["atendimento", "resolvida"]) }),
  z.object({ acao: z.literal("lida") }),
  z.object({ acao: z.literal("bloquear") }),
  z.object({ acao: z.literal("etapa"), etapa: z.enum(ETAPAS as [EtapaId, ...EtapaId[]]).nullable() }),
  z.object({ acao: z.literal("dados"), nome: z.string().max(120).nullish(), email: z.string().max(200).nullish(), telefone: z.string().max(40).nullish(), notas: z.string().max(4000).nullish() }),
]);

/** O que dá para fazer numa conversa: responder, etiquetar, mudar o status, bloquear. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const parsed = acaoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pedido inválido." }, { status: 400 });
  const a = parsed.data;

  const c = await prisma.contact.findUnique({ where: { id } });
  if (!c) return Response.json({ error: "Conversa não encontrada." }, { status: 404 });

  switch (a.acao) {
    case "enviar": {
      const r = await enviarPeloPainel(id, a.texto);
      return r.ok ? Response.json({ ok: true }) : Response.json({ error: r.erro }, { status: 400 });
    }
    case "tag": {
      const tag = a.tag.toLowerCase().replace(/\s+/g, "_");
      const tags = a.remover ? c.tags.filter((t) => t !== tag) : Array.from(new Set([...c.tags, tag]));
      await prisma.contact.update({ where: { id }, data: { tags } });
      break;
    }
    case "status":
      await prisma.contact.update({ where: { id }, data: { status: a.status } });
      break;
    case "lida":
      await prisma.contact.update({ where: { id }, data: { lidoEm: new Date() } });
      break;
    case "bloquear":
      await prisma.contact.update({ where: { id }, data: { bloqueado: true } });
      break;
    case "etapa":
      // null = volta para o automático
      await prisma.contact.update({ where: { id }, data: { etapa: a.etapa ?? "novo" } });
      break;
    case "dados":
      await prisma.contact.update({ where: { id }, data: { nome: a.nome ?? null, email: a.email ?? null, telefone: a.telefone ?? null, notas: a.notas ?? null } });
      break;
  }
  return Response.json({ ok: true });
}
