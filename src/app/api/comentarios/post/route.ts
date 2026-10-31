import type { NextRequest } from "next/server";
import { getActiveCredentials } from "@/lib/credentials";
import { getMedia } from "@/lib/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** O post de um comentário (legenda, miniatura, curtidas). post: null quando a API não deixa ler. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^[\w-]+$/.test(id)) return Response.json({ post: null });
  const creds = await getActiveCredentials();
  if (!creds.accessToken) return Response.json({ post: null });
  return Response.json({ post: await getMedia(creds, id) });
}
