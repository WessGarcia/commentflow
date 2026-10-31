import { prisma } from "@/lib/db";
import { contaConectada } from "@/lib/painel";

/**
 * Primeiros passos (como na Mandei): do zero ao primeiro direct em 4 passos.
 * Cada passo é uma condição real do motor, não enfeite. O cartão some quando
 * os quatro valem ou quando você dispensa.
 */
export type PassoOnboarding = { id: "instagram" | "automacao" | "palavra" | "ligada"; titulo: string; texto: string; feito: boolean; href: string; acao: string };
export type Onboarding = { passos: PassoOnboarding[]; feitos: number; concluido: boolean; dispensado: boolean; proximo: PassoOnboarding | null };

const CHAVE = "onboarding_ok";

export async function estadoOnboarding(): Promise<Onboarding> {
  const [conta, flows, dispensa] = await Promise.all([
    contaConectada(),
    prisma.flow.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, enabled: true, matchType: true, keywords: true } }),
    prisma.configuracao.findUnique({ where: { chave: CHAVE } }),
  ]);
  const primeiro = flows[0];
  const palavra = flows.some((f) => f.matchType === "ANY" || f.keywords.length > 0);
  const passos: PassoOnboarding[] = [
    { id: "instagram", titulo: "Conectar o Instagram", texto: "A conta profissional que vai responder os comentários e mandar os directs.", feito: Boolean(conta), href: "/app/configuracoes", acao: "Conectar Instagram" },
    { id: "automacao", titulo: "Criar a primeira automação", texto: "Comece por um modelo pronto: troque a palavra e o link, salve.", feito: flows.length > 0, href: "/app/fluxos?modelos=1", acao: "Escolher um modelo" },
    { id: "palavra", titulo: "Escolher a palavra-chave", texto: "A palavra que, comentada, dispara a resposta e o direct.", feito: palavra, href: primeiro ? `/app/fluxos?editar=${primeiro.id}` : "/app/fluxos?modelos=1", acao: "Abrir a automação" },
    { id: "ligada", titulo: "Ligar e testar", texto: "Com a automação ligada, comente a palavra com outra conta e veja a resposta chegar.", feito: flows.some((f) => f.enabled), href: "/app/fluxos", acao: "Ligar a automação" },
  ];
  const feitos = passos.filter((p) => p.feito).length;
  return { passos, feitos, concluido: feitos === passos.length, dispensado: dispensa?.valor === "1", proximo: passos.find((p) => !p.feito) ?? null };
}

export async function dispensarOnboarding() {
  await prisma.configuracao.upsert({ where: { chave: CHAVE }, update: { valor: "1" }, create: { chave: CHAVE, valor: "1" } });
}
