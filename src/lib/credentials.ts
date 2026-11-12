import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { decryptSecret } from "@/lib/crypto";
import type { IgCredentials } from "@/lib/meta";

/**
 * Credentials used to call the Graph API.
 * Prefers the most recently connected account (via OAuth); falls back to the
 * manual IG_ACCESS_TOKEN / IG_USER_ID from the environment.
 * O login unificado entrega um token de usuário do sistema: não tem renovação.
 * Se a Meta recusar o token, o painel avisa para conectar de novo (avisarReconexao).
 */
export async function getActiveCredentials(): Promise<IgCredentials> {
  try {
    const account = await prisma.account.findFirst({
      where: { accessToken: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    const token = decryptSecret(account?.accessToken);
    if (token && account?.igUserId) {
      return { accessToken: token, igUserId: account.igUserId };
    }
  } catch {
    // DB unavailable — fall back to env.
  }
  return { accessToken: env.igAccessToken, igUserId: env.igUserId };
}
