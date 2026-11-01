import type { NextRequest } from "next/server";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { carregarConfigMeta } from "@/lib/configMeta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login do Instagram (API do Instagram com login do Instagram): sem Página do Facebook.
const ESCOPOS = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
];

export async function GET(req: NextRequest) {
  await carregarConfigMeta();
  if (!env.metaAppId) {
    // ainda sem app da Meta: o assistente explica o que fazer
    return new Response(null, { status: 303, headers: { Location: "/app/ligar-meta?falta=app" } });
  }

  const redirectUri =
    env.metaRedirectUri || `${req.nextUrl.origin}/api/auth/meta/callback`;
  const state = crypto.randomUUID();

  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", env.metaAppId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", ESCOPOS.join(","));
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
