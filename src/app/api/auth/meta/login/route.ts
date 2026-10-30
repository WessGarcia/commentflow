import type { NextRequest } from "next/server";
import crypto from "node:crypto";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPES = [
  "instagram_basic",
  "instagram_manage_comments",
  "instagram_manage_messages",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "business_management",
];

export async function GET(req: NextRequest) {
  if (!env.metaAppId) {
    return new Response("META_APP_ID não configurado no .env", { status: 500 });
  }

  const redirectUri =
    env.metaRedirectUri || `${req.nextUrl.origin}/api/auth/meta/callback`;
  const state = crypto.randomUUID();

  const url = new URL(
    `https://www.facebook.com/${env.graphVersion}/dialog/oauth`,
  );
  url.searchParams.set("client_id", env.metaAppId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES.join(","));
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
