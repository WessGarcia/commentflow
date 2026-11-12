import type { NextRequest } from "next/server";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { carregarConfigMeta } from "@/lib/configMeta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Login unificado da Meta (Login do Facebook para Empresas com config_id).
 * As permissões vêm da configuração escolhida pelo config_id, por isso não vai `scope`.
 */
export async function GET(req: NextRequest) {
  await carregarConfigMeta();
  if (!env.metaAppId) {
    // ainda sem app da Meta: o assistente explica o que fazer
    return new Response(null, { status: 303, headers: { Location: "/app/ligar-meta?falta=app" } });
  }
  if (!env.metaConfigId) {
    return new Response(null, {
      status: 303,
      headers: { Location: `/app/configuracoes?${new URLSearchParams({ meta: "erro:falta META_CONFIG_ID (ID da configuração do login)" })}` },
    });
  }

  const redirectUri =
    env.metaRedirectUri || `${req.nextUrl.origin}/api/auth/meta/callback`;
  const state = crypto.randomUUID();

  const url = new URL("https://www.facebook.com/dialog/oauth");
  url.searchParams.set("client_id", env.metaAppId);
  url.searchParams.set("config_id", env.metaConfigId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": `meta_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    },
  });
}
