import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Lock } from "lucide-react";
import { ehLocal, senhaDoPainel } from "@/lib/sessao";
import "../app/painel.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: "Entrar · CommentFlow",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ erro?: string; volta?: string }> }) {
  const sp = await searchParams;
  const h = await headers();
  const temSenha = Boolean(senhaDoPainel());
  const local = ehLocal(h.get("x-forwarded-host") ?? h.get("host"));
  const volta = sp.volta?.startsWith("/app") ? sp.volta : "/app";

  return (
    <div className={`painel ${jakarta.variable}`} style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
      <div className="m-card rise-in" style={{ width: 400, maxWidth: "100%", padding: 28 }}>
        <div className="flex items-center" style={{ gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/commentflow-logo.svg" alt="" width={36} height={36} style={{ borderRadius: 10 }} />
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>CommentFlow</span>
        </div>

        {temSenha ? (
          <form method="post" action="/api/entrar" style={{ marginTop: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Entrar no painel</div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>Digite a senha do painel para continuar.</div>
            <input type="hidden" name="volta" value={volta} />
            <label className="m-label" htmlFor="senha" style={{ marginTop: 20 }}>Senha</label>
            <input id="senha" name="senha" type="password" className="m-input" autoComplete="current-password" autoFocus required />
            {sp.erro && <div role="alert" style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: "var(--danger-text)" }}>Senha errada. Tente de novo.</div>}
            <button type="submit" className="m-btn" style={{ width: "100%", marginTop: 18 }}><Lock size={16} /> Entrar</button>
            <div className="m-hint" style={{ textAlign: "center", marginTop: 14 }}>Esqueceu? A senha é o valor de <code>PAINEL_SENHA</code> no <code>.env</code> (ou nas variáveis da Render).</div>
          </form>
        ) : local ? (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Painel sem senha</div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.55 }}>No seu computador o painel abre direto. Para colocar no ar, defina <code>PAINEL_SENHA</code> no <code>.env</code>.</div>
            <Link href="/app" className="m-btn" style={{ width: "100%", marginTop: 18 }}>Abrir o painel</Link>
          </div>
        ) : (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Painel trancado</div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.55 }}>
              Por segurança, o painel só abre fora do computador depois que você cria uma senha. Coloque <code>PAINEL_SENHA=&quot;sua senha&quot;</code> no <code>.env</code> (ou em <i>Environment</i>, na Render) e reinicie.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
