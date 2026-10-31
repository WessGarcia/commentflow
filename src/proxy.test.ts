import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { criarSessao } from "@/lib/sessao";
import { proxy as portao } from "@/proxy";

const pedir = (caminho: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(caminho, "http://painel.exemplo.com"), { headers: { host: "painel.exemplo.com", ...headers } });
const passou = (r: Response) => r.headers.get("x-middleware-next") === "1";

describe("portão do painel", () => {
  it("deixa a Meta chamar o webhook e o instalador ler a saúde sem cookie", () => {
    vi.stubEnv("PAINEL_SENHA", "cf-teste");
    expect(passou(portao(pedir("/api/webhooks/instagram")))).toBe(true);
    expect(passou(portao(pedir("/api/saude")))).toBe(true);
    expect(passou(portao(pedir("/api/entrar")))).toBe(true);
  });

  it("com senha: API sem cookie recebe 401 e painel vai para /entrar com a volta", async () => {
    vi.stubEnv("PAINEL_SENHA", "cf-teste");
    const api = portao(pedir("/api/flows"));
    expect(api.status).toBe(401);
    expect(await api.json()).toEqual({ error: "Entre no painel primeiro." });
    const tela = portao(pedir("/app/fluxos?modelos=1", { "x-forwarded-proto": "https" }));
    expect(tela.status).toBe(307);
    expect(tela.headers.get("location")).toBe("https://painel.exemplo.com/entrar?volta=%2Fapp%2Ffluxos%3Fmodelos%3D1");
  });

  it("com senha: cookie válido entra, cookie de outra senha não", () => {
    vi.stubEnv("PAINEL_SENHA", "cf-teste");
    expect(passou(portao(pedir("/app", { cookie: `cf_sessao=${criarSessao("cf-teste")}` })))).toBe(true);
    expect(portao(pedir("/api/flows", { cookie: `cf_sessao=${criarSessao("outra")}` })).status).toBe(401);
  });

  it("com senha: estar no localhost não dispensa a senha", () => {
    vi.stubEnv("PAINEL_SENHA", "cf-teste");
    expect(portao(pedir("/api/flows", { host: "localhost:3000" })).status).toBe(401);
  });

  it("sem senha: abre só no próprio computador", () => {
    vi.stubEnv("PAINEL_SENHA", "");
    expect(passou(portao(pedir("/app", { host: "localhost:3000" })))).toBe(true);
    const fora = portao(pedir("/api/flows"));
    expect(fora.status).toBe(401);
  });

  it("sem senha: X-Forwarded-Host forjado não vira localhost", () => {
    vi.stubEnv("PAINEL_SENHA", "");
    expect(portao(pedir("/api/flows", { "x-forwarded-host": "localhost" })).status).toBe(401);
    expect(portao(pedir("/api/flows", { host: "localhost.evil.com" })).status).toBe(401);
  });
});
