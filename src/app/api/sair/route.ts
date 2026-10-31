import { COOKIE_SESSAO } from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/entrar",
      "Set-Cookie": `${COOKIE_SESSAO}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    },
  });
}
