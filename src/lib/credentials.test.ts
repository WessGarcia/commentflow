import { afterEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
vi.mock("@/lib/db", () => ({ prisma: { account: { findFirst } } }));
vi.mock("@/lib/crypto", () => ({ decryptSecret: (v?: string | null) => v ?? "", encryptSecret: (v: string) => v }));

const { getActiveCredentials } = await import("./credentials");

afterEach(() => vi.restoreAllMocks());

describe("credenciais da conta conectada (login unificado)", () => {
  it("usa o token da conta e o id do Instagram, sem tentar renovar", async () => {
    const f = vi.spyOn(globalThis, "fetch");
    // token de usuário do sistema perto de "vencer": mesmo assim não chama a Meta
    findFirst.mockResolvedValue({ id: "a", igUserId: "1789", accessToken: "tok", tokenExpiraEm: new Date(Date.now() + 86_400_000) });
    expect(await getActiveCredentials()).toEqual({ accessToken: "tok", igUserId: "1789" });
    expect(f).not.toHaveBeenCalled();
  });

  it("sem conta conectada, cai no token do .env", async () => {
    findFirst.mockResolvedValue(null);
    vi.stubEnv("IG_ACCESS_TOKEN", "manual");
    vi.stubEnv("IG_USER_ID", "42");
    expect(await getActiveCredentials()).toEqual({ accessToken: "manual", igUserId: "42" });
    vi.unstubAllEnvs();
  });
});
