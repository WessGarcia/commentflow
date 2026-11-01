import type { NextRequest } from "next/server";
import { z } from "zod";
import { salvarConfigMeta } from "@/lib/configMeta";
import { estadoDaInstalacao } from "@/lib/saude";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corpo = z.object({
  appId: z.string().trim().regex(/^\d{6,20}$/, "O ID do app do Instagram tem só números (Casos de uso → API do Instagram → Configuração da API com login do Instagram).").or(z.literal("")).optional(),
  appSecret: z.string().trim().regex(/^[a-f0-9]{32}$/i, "A chave secreta do app do Instagram tem 32 letras e números (clique em Mostrar ao lado dela).").or(z.literal("")).optional(),
  endereco: z.string().trim().pipe(z.url("Cole o endereço completo, começando com https://")).refine((u) => u.startsWith("https://"), "A Meta só aceita endereço com https://.").or(z.literal("")).optional(),
});

/** Salva o que o assistente "Ligar a Meta" recebeu. A chave secreta nunca volta para a tela. */
export async function POST(req: NextRequest) {
  const parsed = corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const d = parsed.data;
  await salvarConfigMeta({ ...d, endereco: d.endereco ? new URL(d.endereco).origin : d.endereco });
  return Response.json({ ok: true, estado: await estadoDaInstalacao() });
}

/** Testa de fora: o endereço público chega no webhook? (o mesmo teste que a Meta faz) */
export async function GET() {
  const e = await estadoDaInstalacao();
  const base = e.meta.enderecoPublico;
  if (!base) return Response.json({ ok: false, erro: "Ainda não há endereço público." });
  try {
    const url = `${base}/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(env.igVerifyToken)}&hub.challenge=commentflow-teste`;
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    const texto = await r.text();
    if (texto === "commentflow-teste") return Response.json({ ok: true });
    return Response.json({ ok: false, erro: r.status === 403 ? "O endereço chegou num CommentFlow com outro token: confira se é o endereço certo." : `O endereço respondeu ${r.status}, mas não o webhook. O túnel aponta para a porta 3000?` });
  } catch {
    return Response.json({ ok: false, erro: "Não deu para alcançar o endereço público. O túnel está ligado? O endereço mudou?" });
  }
}
