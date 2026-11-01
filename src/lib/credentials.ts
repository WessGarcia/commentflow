import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import type { IgCredentials } from "@/lib/meta";

const DIA = 86_400_000;
let ultimaTentativa = 0;

/** O token do login do Instagram vale 60 dias; renova quando faltam menos de 30 (já tem mais de 24 h). */
export function precisaRenovar(expiraEm: Date | null | undefined, agora = Date.now()) {
  return !!expiraEm && expiraEm.getTime() > agora && expiraEm.getTime() - agora < 30 * DIA;
}

/** Troca o token por um novo de 60 dias. Falha não derruba nada: o atual segue valendo até vencer. */
async function renovar(id: string, token: string) {
  if (Date.now() - ultimaTentativa < 3_600_000) return token;
  ultimaTentativa = Date.now();
  try {
    const r = await fetch(
      `${env.graphBaseUrl}/refresh_access_token?` +
        new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token }),
    );
    const j = (await r.json()) as { access_token?: string; expires_in?: number };
    if (!r.ok || !j.access_token) {
      console.error("renovar token falhou", r.status, JSON.stringify(j).slice(0, 200));
      return token;
    }
    await prisma.account.update({
      where: { id },
      data: {
        accessToken: encryptSecret(j.access_token),
        tokenExpiraEm: new Date(Date.now() + (j.expires_in ?? 5_184_000) * 1000),
      },
    });
    return j.access_token;
  } catch (e) {
    console.error("renovar token falhou", e);
    return token;
  }
}

/**
 * Credentials used to call the Graph API.
 * Prefers the most recently connected account (via OAuth); falls back to the
 * manual IG_ACCESS_TOKEN / IG_USER_ID from the environment.
 */
export async function getActiveCredentials(): Promise<IgCredentials> {
  try {
    const account = await prisma.account.findFirst({
      where: { accessToken: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    let token = decryptSecret(account?.accessToken);
    if (token && account?.igUserId) {
      if (precisaRenovar(account.tokenExpiraEm)) token = await renovar(account.id, token);
      return { accessToken: token, igUserId: account.igUserId };
    }
  } catch {
    // DB unavailable — fall back to env.
  }
  return { accessToken: env.igAccessToken, igUserId: env.igUserId };
}
