import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/configMeta", () => ({ carregarConfigMeta: async () => ({}), configMeta: {} }));

const { GET } = await import("./route");

afterEach(() => vi.unstubAllEnvs());

const entrar = () => GET(new NextRequest("http://localhost:3000/api/auth/meta/login"));

describe("botão Conectar Instagram (login unificado)", () => {
  it("abre o login do Facebook com config_id e sem scope", async () => {
    vi.stubEnv("META_APP_ID", "1715048296844486");
    vi.stubEnv("META_CONFIG_ID", "1433894061709939");
    vi.stubEnv("META_REDIRECT_URI", "https://painel.exemplo.com/api/auth/meta/callback");
    const res = await entrar();
    expect(res.status).toBe(302);
    const u = new URL(res.headers.get("location") ?? "");
    expect(`${u.origin}${u.pathname}`).toBe("https://www.facebook.com/dialog/oauth");
    expect(u.searchParams.get("client_id")).toBe("1715048296844486");
    expect(u.searchParams.get("config_id")).toBe("1433894061709939");
    expect(u.searchParams.get("redirect_uri")).toBe("https://painel.exemplo.com/api/auth/meta/callback");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.has("scope")).toBe(false);
    const state = u.searchParams.get("state");
    expect(state).toBeTruthy();
    expect(res.headers.get("set-cookie")).toContain(`meta_oauth_state=${state}`);
  });

  it("sem o ID da configuração, avisa em Configurações em vez de abrir um login quebrado", async () => {
    vi.stubEnv("META_APP_ID", "1715048296844486");
    vi.stubEnv("META_CONFIG_ID", "");
    const res = await entrar();
    expect(res.headers.get("location")).toMatch(/^\/app\/configuracoes\?meta=erro%3Afalta\+META_CONFIG_ID/);
  });
});
