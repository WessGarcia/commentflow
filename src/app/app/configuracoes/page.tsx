import { headers } from "next/headers";
import Link from "next/link";
import { ArrowRight, Instagram, KeyRound, Lock, Webhook } from "lucide-react";
import { getConfiguracoes } from "@/lib/painel";
import { BancoFora } from "../_ui/banco-fora";
import { Card, PageHeader, Pill, Tile } from "../_ui/ui";
import { Contas, Copiar } from "./conexao";

export const dynamic = "force-dynamic";

const GUIA = "https://github.com/gabrieltabarkiewicz/commentflow/blob/main/docs/GUIA.md";

function avisoMeta(meta?: string) {
  if (!meta) return null;
  if (meta.startsWith("conectado:")) return { ok: true, texto: `${meta.split(":")[1] ?? "1"} conta(s) conectada(s).` };
  if (meta.startsWith("sem-avisos:")) return { ok: false, texto: "Conta conectada, mas a Meta recusou ligar os avisos. Confira se os webhooks estão configurados no app da Meta e conecte de novo." };
  return { ok: false, texto: `Não foi possível conectar: ${meta.replace(/^erro:/, "")}.` };
}

/** Uma linha de checagem: o que é, se está pronto e o que fazer. */
function Linha({ rotulo, pronto, dica }: { rotulo: string; pronto: boolean; dica: string }) {
  return (
    <div className="grid items-center m-canal-linha" style={{ gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1.3fr)", gap: 14, padding: "13px 0", borderTop: "1px solid var(--m-divider-soft)" }}>
      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{rotulo}</span>
      <Pill tom={pronto ? "verde" : "ambar"} dot>{pronto ? "Pronto" : "Falta"}</Pill>
      <span style={{ fontSize: 12.5, color: "var(--m-text-dim)", lineHeight: 1.45 }}>{dica}</span>
    </div>
  );
}

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ meta?: string }> }) {
  const sp = await searchParams;
  const c = await getConfiguracoes().catch(() => null);
  if (!c) return <BancoFora />;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origem = `${proto}://${host}`;
  const aviso = avisoMeta(sp.meta);

  return (
    <div className="rise-in">
      <PageHeader titulo="Configurações" sub="A conexão com o Instagram e o que o CommentFlow precisa para responder sozinho.">
        <Link href="/app/ligar-meta" className="m-btn">Assistente: ligar a Meta <ArrowRight size={16} /></Link>
      </PageHeader>

      {aviso && (
        <div role="status" className="m-card" style={{ padding: "14px 18px", marginBottom: 18, borderColor: aviso.ok ? "var(--success)" : "var(--danger)", color: aviso.ok ? "var(--success-text)" : "var(--danger-text)", fontWeight: 700, fontSize: 14 }}>
          {aviso.texto}
        </div>
      )}

      <div className="grid items-start" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20 }}>
        <Card>
          <div className="flex items-center gap-2.5" style={{ marginBottom: 14 }}>
            <Tile tom="ig" size={30} radius={9}><Instagram size={16} /></Tile>
            <h2 className="m-h2">Instagram</h2>
          </div>
          <Contas contas={c.contas} />
        </Card>

        <Card>
          <div className="flex items-center gap-2.5" style={{ marginBottom: 6 }}>
            <Tile tom="azul" size={30} radius={9}><KeyRound size={16} /></Tile>
            <h2 className="m-h2">App na Meta</h2>
            <a href={GUIA} target="_blank" rel="noreferrer" className="ml-auto" style={{ fontSize: 13, fontWeight: 700 }}>Ver o guia</a>
          </div>
          <Linha rotulo="ID do app" pronto={c.meta.appId} dica="META_APP_ID no .env. Fica em Meta for Developers > Configurações > Básico." />
          <Linha rotulo="Chave secreta" pronto={c.meta.appSecret} dica="META_APP_SECRET no .env. Confere a assinatura de cada aviso da Meta." />
          <Linha rotulo="Token do webhook" pronto={c.meta.verifyToken} dica="IG_VERIFY_TOKEN no .env. O mesmo texto vai no cadastro do webhook na Meta." />
        </Card>

        <Card>
          <div className="flex items-center gap-2.5" style={{ marginBottom: 14 }}>
            <Tile tom="roxo" size={30} radius={9}><Webhook size={16} /></Tile>
            <h2 className="m-h2">Webhook</h2>
          </div>
          <div className="m-label">Endereço do webhook</div>
          <Copiar texto={`${origem}/api/webhooks/instagram`} />
          <div className="m-hint">Cadastre na Meta e assine os campos <b>comments</b> e <b>messages</b>. A Meta só chama endereço público com https: no computador, use um túnel.</div>
          <div className="m-label" style={{ marginTop: 16 }}>Volta do login da Meta</div>
          <Copiar texto={c.meta.redirect ?? `${origem}/api/auth/meta/callback`} />
          <div className="m-hint">Cadastre em Login do Facebook para Empresas &gt; Configurações &gt; URIs de redirecionamento do OAuth válidos.</div>
        </Card>

        <Card>
          <div className="flex items-center gap-2.5" style={{ marginBottom: 6 }}>
            <Tile tom="verde" size={30} radius={9}><Lock size={16} /></Tile>
            <h2 className="m-h2">Segurança</h2>
          </div>
          <Linha rotulo="Acessos criptografados" pronto={c.criptografia} dica="ENCRYPTION_KEY no .env. Os acessos do Instagram ficam guardados criptografados no banco." />
          <Linha rotulo="Assinatura dos avisos" pronto={c.meta.appSecret} dica="Aviso da Meta sem assinatura válida é recusado." />
          <Linha rotulo="Senha do painel" pronto={c.senhaPainel} dica="PAINEL_SENHA no .env. Sem ela, o painel só abre no seu computador (localhost)." />
        </Card>
      </div>
    </div>
  );
}
