import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { carregarConfigMeta } from "@/lib/configMeta";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Os avisos que o motor usa (ver api/webhooks/instagram e lib/gatilhos.ts).
const CAMPOS = "comments,live_comments,messages,messaging_postbacks,message_reactions";

function home(meta: string) {
  // endereço relativo: atrás de túnel/proxy o req.nextUrl.origin é o host interno (localhost:3000)
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/app/configuracoes?${new URLSearchParams({ meta })}`,
      // clear the CSRF cookie
      "Set-Cookie": "meta_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}

/** Volta do login do Instagram: código → token curto → token de 60 dias → conta → avisos. */
export async function GET(req: NextRequest) {
  await carregarConfigMeta();
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const cookieState = req.cookies.get("meta_oauth_state")?.value;

  if (sp.get("error")) {
    return home(`erro:${sp.get("error_description") ?? sp.get("error")}`);
  }
  if (!code) return home("erro:sem-code");
  if (!state || !cookieState || state !== cookieState) {
    return home("erro:estado-invalido");
  }
  if (!env.metaAppId || !env.metaAppSecret) {
    return home("erro:app-nao-configurado");
  }

  const graph = `${env.graphBaseUrl}/${env.graphVersion}`;
  const redirectUri =
    env.metaRedirectUri || `${req.nextUrl.origin}/api/auth/meta/callback`;

  try {
    // 1) code -> short-lived token (1 h)
    const curtoRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.metaAppId,
        client_secret: env.metaAppSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    const curto = (await curtoRes.json()) as { access_token?: string };
    if (!curtoRes.ok || !curto.access_token) return home("erro:falha-no-token");

    // 2) short-lived -> long-lived token (60 days; lib/credentials renews it)
    const longoRes = await fetch(
      `${env.graphBaseUrl}/access_token?` +
        new URLSearchParams({
          grant_type: "ig_exchange_token",
          client_secret: env.metaAppSecret,
          access_token: curto.access_token,
        }),
    );
    const longo = (await longoRes.json()) as { access_token?: string; expires_in?: number };
    if (!longoRes.ok || !longo.access_token) return home("erro:falha-no-token");
    const token = longo.access_token;

    // 3) who is it. user_id is the professional account id: the one the webhooks send
    const euRes = await fetch(
      `${graph}/me?` + new URLSearchParams({ fields: "user_id,username", access_token: token }),
    );
    const eu = (await euRes.json()) as { user_id?: string | number; username?: string };
    if (!euRes.ok || !eu.user_id) return home("erro:sem-conta-profissional");
    const igUserId = String(eu.user_id);

    // 4) subscribe the app to this account's webhooks; without it Meta sends nothing
    const subRes = await fetch(
      `${graph}/me/subscribed_apps?` +
        new URLSearchParams({ subscribed_fields: CAMPOS, access_token: token }),
      { method: "POST" },
    );
    if (!subRes.ok) console.error("subscribed_apps falhou", igUserId, await subRes.text());

    const dados = {
      username: eu.username ?? null,
      accessToken: encryptSecret(token),
      tokenExpiraEm: new Date(Date.now() + (longo.expires_in ?? 5_184_000) * 1000),
    };
    await prisma.account.upsert({
      where: { igUserId },
      update: dados,
      create: { igUserId, ...dados },
    });

    return home(subRes.ok ? "conectado:1" : "sem-avisos:1");
  } catch (e) {
    return home(`erro:${String(e)}`);
  }
}
