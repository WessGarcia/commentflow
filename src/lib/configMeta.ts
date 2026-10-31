import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

/**
 * Chaves da Meta e endereço público salvos pelo assistente do painel
 * ("Ligar a Meta"). Ficam no banco (a chave secreta criptografada) e valem
 * na hora, sem reiniciar. O que foi salvo pelo painel vale por cima do .env;
 * o .env continua funcionando para quem prefere configurar por ele.
 *
 * O env.ts lê daqui de forma síncrona: quem usa as chaves chama
 * carregarConfigMeta() antes (fica em memória por alguns segundos).
 */

const CHAVES = { appId: "meta_app_id", appSecret: "meta_app_secret", endereco: "endereco_publico" } as const;
const VALIDADE_MS = 15_000;

export const configMeta: { appId?: string; appSecret?: string; endereco?: string } = {};
let carregadoEm = 0;

export async function carregarConfigMeta(forcar = false) {
  if (!forcar && Date.now() - carregadoEm < VALIDADE_MS) return configMeta;
  try {
    const linhas = await prisma.configuracao.findMany({ where: { chave: { in: Object.values(CHAVES) } } });
    const valor = (k: string) => linhas.find((l) => l.chave === k)?.valor || undefined;
    configMeta.appId = valor(CHAVES.appId);
    configMeta.appSecret = decryptSecret(valor(CHAVES.appSecret)) || undefined;
    configMeta.endereco = valor(CHAVES.endereco);
    carregadoEm = Date.now();
  } catch {
    // banco fora: segue com o .env
  }
  return configMeta;
}

async function guardar(chave: string, valor: string | null) {
  if (valor === null) await prisma.configuracao.deleteMany({ where: { chave } });
  else await prisma.configuracao.upsert({ where: { chave }, update: { valor }, create: { chave, valor } });
}

/** Salva o que veio do assistente. undefined = não mexe; "" = apaga (volta para o .env). */
export async function salvarConfigMeta(d: { appId?: string; appSecret?: string; endereco?: string }) {
  if (d.appId !== undefined) await guardar(CHAVES.appId, d.appId || null);
  if (d.appSecret !== undefined) await guardar(CHAVES.appSecret, d.appSecret ? encryptSecret(d.appSecret) : null);
  if (d.endereco !== undefined) await guardar(CHAVES.endereco, d.endereco ? d.endereco.replace(/\/$/, "") : null);
  await carregarConfigMeta(true);
}
