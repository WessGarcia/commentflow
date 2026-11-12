import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { carregarConfigMeta } from "@/lib/configMeta";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Os avisos que o motor usa (ver api/webhooks/instagram e lib/gatilhos.ts).
const CAMPOS = "comments,messages,messaging_postbacks";

function home(meta: string) {
  // endereço relativo: atrás de túnel/proxy o req.nextUrl.origin é o host interno (localhost:3000)
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/app/configuracoes?${new URLSearchParams({ meta })}`,
      // clear the CSRF cookie
      "Set-Cookie": "meta_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}

/**
 * Volta do login unificado: código → token de usuário do sistema (sem troca por
 * token longo nem renovação) → contas do Instagram atribuídas → avisos (webhook).
 */
export async function GET(req: NextRequest) {
  await carregarConfigMeta();
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const cookieState = req.cookies.get("meta_oauth_state")?.value;

  if (sp.get("error")) {
    return home(`erro:${sp.get("error_description") ?? sp.get("error")}`);
  }
  if (!code) return home("erro:sem-code");
  if (!state || !cookieState || state !== cookieState) {
    return home("erro:estado-invalido");
  }
  if (!env.metaAppId || !env.metaAppSecret) {
    return home("erro:app-nao-configurado");
  }

  const graph = `${env.graphBaseUrl}/${env.graphVersion}`;
  const redirectUri =
    env.metaRedirectUri || `${req.nextUrl.origin}/api/auth/meta/callback`;

  try {
    // 1) code -> token de usuário do sistema da integração
    const tokenRes = await fetch(
      `${graph}/oauth/access_token?` +
        new URLSearchParams({
          client_id: env.metaAppId,
          client_secret: env.metaAppSecret,
          redirect_uri: redirectUri,
          code,
        }),
    );
    const tk = (await tokenRes.json()) as { access_token?: string; expires_in?: number };
    if (!tokenRes.ok || !tk.access_token) {
      console.error("troca do code falhou", tokenRes.status, JSON.stringify(tk).slice(0, 300));
      return home("erro:falha-no-token");
    }
    const token = tk.access_token;

    // 2) contas do Instagram que a pessoa liberou no login. O id é o que os webhooks mandam
    const contasRes = await fetch(
      `${graph}/me/assigned_instagram_accounts?` +
        new URLSearchParams({ fields: "id,username", access_token: token }),
    );
    const contas = (await contasRes.json()) as { data?: Array<{ id?: string | number; username?: string }> };
    const lista = (contas.data ?? []).filter((c) => c.id);
    if (!contasRes.ok || lista.length === 0) {
      console.error("assigned_instagram_accounts", contasRes.status, JSON.stringify(contas).slice(0, 300));
      return home("erro:sem-conta-instagram");
    }

    let avisosOk = true;
    for (const conta of lista) {
      const igUserId = String(conta.id);

      // 3) inscreve o app nos avisos desta conta; sem isso a Meta não manda nada
      const subRes = await fetch(
        `${graph}/${igUserId}/subscribed_apps?` +
          new URLSearchParams({ subscribed_fields: CAMPOS, access_token: token }),
        { method: "POST" },
      );
      if (!subRes.ok) {
        avisosOk = false;
        console.error("subscribed_apps falhou", igUserId, await subRes.text());
      }

      const dados = {
        username: conta.username ?? null,
        accessToken: encryptSecret(token),
        tokenExpiraEm: tk.expires_in ? new Date(Date.now() + tk.expires_in * 1000) : null,
      };
      await prisma.account.upsert({
        where: { igUserId },
        update: dados,
        create: { igUserId, ...dados },
      });
    }

    return home(`${avisosOk ? "conectado" : "sem-avisos"}:${lista.length}`);
  } catch (e) {
    return home(`erro:${String(e)}`);
  }
}
