import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { carregarConfigMeta } from "@/lib/configMeta";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function home(req: NextRequest, meta: string) {
  const url = new URL("/app/configuracoes", req.nextUrl.origin);
  url.searchParams.set("meta", meta);
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      // clear the CSRF cookie
      "Set-Cookie": "meta_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}

interface PageEntry {
  id?: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: { id?: string; username?: string };
}

export async function GET(req: NextRequest) {
  await carregarConfigMeta();
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const cookieState = req.cookies.get("meta_oauth_state")?.value;

  if (sp.get("error")) {
    return home(req, `erro:${sp.get("error_description") ?? sp.get("error")}`);
  }
  if (!code) return home(req, "erro:sem-code");
  if (!state || !cookieState || state !== cookieState) {
    return home(req, "erro:estado-invalido");
  }
  if (!env.metaAppId || !env.metaAppSecret) {
    return home(req, "erro:app-nao-configurado");
  }

  const v = env.graphVersion;
  const redirectUri =
    env.metaRedirectUri || `${req.nextUrl.origin}/api/auth/meta/callback`;

  try {
    // 1) code -> short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/${v}/oauth/access_token?` +
        new URLSearchParams({
          client_id: env.metaAppId,
          client_secret: env.metaAppSecret,
          redirect_uri: redirectUri,
          code,
        }),
    );
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      return home(req, "erro:falha-no-token");
    }

    // 2) short-lived -> long-lived user token
    const longRes = await fetch(
      `https://graph.facebook.com/${v}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: env.metaAppId,
          client_secret: env.metaAppSecret,
          fb_exchange_token: tokenJson.access_token,
        }),
    );
    const longJson = (await longRes.json()) as { access_token?: string };
    const userToken = longJson.access_token ?? tokenJson.access_token;

    // 3) list pages + connected IG business accounts (page tokens are long-lived)
    const pagesRes = await fetch(
      `https://graph.facebook.com/${v}/me/accounts?` +
        new URLSearchParams({
          fields: "id,name,access_token,instagram_business_account{id,username}",
          access_token: userToken,
        }),
    );
    const pagesJson = (await pagesRes.json()) as { data?: PageEntry[] };
    const pages = pagesJson.data ?? [];

    let connected = 0;
    let semAvisos = 0;
    for (const page of pages) {
      const ig = page.instagram_business_account;
      if (!ig?.id || !page.access_token) continue;

      // 4) subscribe the Page to this app; without it Meta sends no webhooks
      const subRes = await fetch(
        `https://graph.facebook.com/${v}/${page.id}/subscribed_apps?` +
          new URLSearchParams({
            subscribed_fields: "feed,messages,messaging_postbacks",
            access_token: page.access_token,
          }),
        { method: "POST" },
      );
      if (!subRes.ok) {
        semAvisos++;
        console.error("subscribed_apps falhou", page.id, await subRes.text());
      }

      const token = encryptSecret(page.access_token);
      await prisma.account.upsert({
        where: { igUserId: ig.id },
        update: { username: ig.username ?? null, accessToken: token },
        create: {
          igUserId: ig.id,
          username: ig.username ?? null,
          accessToken: token,
        },
      });
      connected++;
    }

    if (connected === 0) return home(req, "erro:sem-conta-ig-business");
    return home(
      req,
      semAvisos > 0 ? `sem-avisos:${connected}` : `conectado:${connected}`,
    );
  } catch (e) {
    return home(req, `erro:${String(e)}`);
  }
}
