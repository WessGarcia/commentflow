import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, ehLocal, senhaDoPainel, sessaoValida } from "@/lib/sessao";

export const config = {
  matcher: ["/app/:path*", "/api/:path*"],
};

// A Meta chama o webhook sem cookie; entrar e sair cuidam da própria sessão;
// /api/saude só diz sim/não (o instalador consulta).
const LIVRES = ["/api/webhooks/", "/api/entrar", "/api/sair", "/api/saude"];

/** Tranca o painel e as rotas internas atrás da senha (ver lib/sessao.ts). */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (LIVRES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const senha = senhaDoPainel();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  // sem senha, só o Host decide: X-Forwarded-Host vem de quem chama e passa por túnel/proxy
  if (!senha && ehLocal(req.headers.get("host"))) return NextResponse.next();
  if (senha && sessaoValida(req.cookies.get(COOKIE_SESSAO)?.value, senha)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: senha ? "Entre no painel primeiro." : "Defina PAINEL_SENHA para usar o painel fora do computador." }, { status: 401 });
  }
  // monta o endereço pelos cabeçalhos do proxy (Render, túnel): o req.url pode trazer o host interno
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const url = new URL(`${proto}://${host ?? req.nextUrl.host}/entrar`);
  url.searchParams.set("volta", pathname + search);
  return NextResponse.redirect(url);
}
