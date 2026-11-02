import { getActiveCredentials } from "@/lib/credentials";
import { listarPublicacoes } from "@/lib/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROS = {
  token: "A conexão com o Instagram venceu. Vá em Configurações e conecte a conta de novo.",
  falha: "Não deu para buscar suas publicações agora. Tente de novo em instantes ou cole o ID à mão.",
};

/** Publicações recentes da conta conectada, para escolher o post de uma automação. */
export async function GET() {
  const creds = await getActiveCredentials();
  if (!creds.accessToken) return Response.json({ error: "Conecte sua conta do Instagram primeiro, em Configurações." }, { status: 409 });
  const r = await listarPublicacoes(creds);
  if ("erro" in r) return Response.json({ error: ERROS[r.erro] }, { status: 502 });
  return Response.json({ itens: r.itens });
}
