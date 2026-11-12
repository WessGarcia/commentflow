import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const upsert = vi.fn();
vi.mock("@/lib/configMeta", () => ({ carregarConfigMeta: async () => ({}), configMeta: {} }));
vi.mock("@/lib/db", () => ({ prisma: { account: { upsert } } }));
vi.mock("@/lib/crypto", () => ({ encryptSecret: (v: string) => `enc:${v}` }));

const { GET } = await import("./route");

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  upsert.mockReset();
});

const volta = (q: string) =>
  new NextRequest(`http://localhost:3000/api/auth/meta/callback?${q}`, { headers: { cookie: "meta_oauth_state=s1" } });

describe("volta do login unificado da Meta", () => {
  it("redireciona com endereço relativo, sem o host interno do túnel", async () => {
    // atrás do túnel o Next enxerga localhost:3000; o navegador tem que ficar no endereço público
    const res = await GET(new NextRequest("http://localhost:3000/api/auth/meta/callback?error=access_denied"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/app/configuracoes?meta=erro%3Aaccess_denied");
  });

  it("recusa estado diferente do cookie", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/meta/callback?code=x&state=a", { headers: { cookie: "meta_oauth_state=b" } });
    expect((await GET(req)).headers.get("location")).toBe("/app/configuracoes?meta=erro%3Aestado-invalido");
  });

  it("troca o code no graph.facebook.com, pega a conta atribuída e liga os avisos nela", async () => {
    vi.stubEnv("META_APP_ID", "1715048296844486");
    vi.stubEnv("META_APP_SECRET", "segredo");
    vi.stubEnv("META_REDIRECT_URI", "https://painel.exemplo.com/api/auth/meta/callback");
    vi.stubEnv("GRAPH_API_VERSION", "v27.0");
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada) => {
      const u = new URL(String(entrada));
      if (u.pathname === "/v27.0/oauth/access_token") return Response.json({ access_token: "sys-token", token_type: "bearer" });
      if (u.pathname === "/v27.0/me/assigned_instagram_accounts") return Response.json({ data: [{ id: "17841400000000001", username: "wessgarcia" }] });
      if (u.pathname === "/v27.0/17841400000000001/subscribed_apps") return Response.json({ success: true });
      return new Response("inesperado", { status: 500 });
    });

    const res = await GET(volta("code=abc&state=s1"));
    expect(res.headers.get("location")).toBe("/app/configuracoes?meta=conectado%3A1");

    const urls = f.mock.calls.map((c) => new URL(String(c[0])));
    expect(urls.every((u) => u.host === "graph.facebook.com")).toBe(true);
    const troca = urls[0];
    expect(troca.searchParams.get("client_id")).toBe("1715048296844486");
    expect(troca.searchParams.get("client_secret")).toBe("segredo");
    expect(troca.searchParams.get("redirect_uri")).toBe("https://painel.exemplo.com/api/auth/meta/callback");
    expect(troca.searchParams.get("code")).toBe("abc");
    expect(urls[1].searchParams.get("fields")).toBe("id,username");
    expect(f.mock.calls[2][1]?.method).toBe("POST");
    expect(urls[2].searchParams.get("subscribed_fields")).toBe("comments,messages,messaging_postbacks");
    // sem troca por token longo nem refresh
    expect(urls).toHaveLength(3);

    expect(upsert).toHaveBeenCalledWith({
      where: { igUserId: "17841400000000001" },
      update: { username: "wessgarcia", accessToken: "enc:sys-token", tokenExpiraEm: null },
      create: { igUserId: "17841400000000001", username: "wessgarcia", accessToken: "enc:sys-token", tokenExpiraEm: null },
    });
  });

  it("sem conta do Instagram atribuída, avisa e não salva nada", async () => {
    vi.stubEnv("META_APP_ID", "1");
    vi.stubEnv("META_APP_SECRET", "s");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada) =>
      String(entrada).includes("/oauth/access_token") ? Response.json({ access_token: "t" }) : Response.json({ data: [] }),
    );
    const res = await GET(volta("code=abc&state=s1"));
    expect(res.headers.get("location")).toBe("/app/configuracoes?meta=erro%3Asem-conta-instagram");
    expect(upsert).not.toHaveBeenCalled();
  });
});
