import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/configMeta", () => ({ carregarConfigMeta: async () => ({}), configMeta: {} }));
vi.mock("@/lib/db", () => ({ prisma: {} }));

const { GET } = await import("./route");

describe("volta do login do Instagram", () => {
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
});
