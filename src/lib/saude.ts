import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { isEncryptionEnabled } from "@/lib/crypto";
import { senhaDoPainel } from "@/lib/sessao";
import { carregarConfigMeta } from "@/lib/configMeta";

/**
 * Em que ponto a instalação está. Só "sim/não" e datas: nenhum segredo sai
 * daqui. O instalador (scripts/setup.mjs) e o assistente "Ligar a Meta" leem
 * isso para dizer o próximo passo.
 */

const CHAVE_VERIFICADO = "webhook_verificado_em";
const CHAVE_AVISO = "webhook_ultimo_aviso_em";

/** O webhook anota quando a Meta o verificou e quando mandou o último aviso. Nunca derruba o webhook. */
export function anotarWebhook(tipo: "verificado" | "aviso") {
  const chave = tipo === "verificado" ? CHAVE_VERIFICADO : CHAVE_AVISO;
  const valor = new Date().toISOString();
  return prisma.configuracao.upsert({ where: { chave }, update: { valor }, create: { chave, valor } }).catch(() => undefined);
}

export async function estadoDaInstalacao() {
  await carregarConfigMeta();
  let banco = false;
  let conta: string | null = null;
  let verificadoEm: string | null = null;
  let ultimoAvisoEm: string | null = null;
  let automacoes = 0;
  try {
    const [c, cfg, n] = await Promise.all([
      prisma.account.findFirst({ where: { accessToken: { not: null } }, orderBy: { createdAt: "desc" }, select: { username: true, igUserId: true } }),
      prisma.configuracao.findMany({ where: { chave: { in: [CHAVE_VERIFICADO, CHAVE_AVISO] } } }),
      prisma.flow.count(),
    ]);
    banco = true;
    conta = c ? c.username ?? c.igUserId : null;
    verificadoEm = cfg.find((x) => x.chave === CHAVE_VERIFICADO)?.valor ?? null;
    ultimoAvisoEm = cfg.find((x) => x.chave === CHAVE_AVISO)?.valor ?? null;
    automacoes = n;
  } catch {
    banco = false;
  }
  return {
    ok: banco,
    banco,
    seguranca: { criptografia: isEncryptionEnabled(), senhaPainel: Boolean(senhaDoPainel()) },
    meta: {
      appId: Boolean(env.metaAppId),
      appSecret: Boolean(env.metaAppSecret),
      verifyToken: Boolean(env.igVerifyToken),
      enderecoPublico: env.enderecoPublico || null,
    },
    webhook: { verificadoEm, ultimoAvisoEm },
    instagram: { conectado: Boolean(conta), conta },
    automacoes,
  };
}
