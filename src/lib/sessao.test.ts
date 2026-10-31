import { afterEach, describe, expect, it, vi } from "vitest";
import { criarSessao, DIAS_SESSAO, ehLocal, senhaConfere, sessaoValida } from "@/lib/sessao";

afterEach(() => vi.useRealTimers());

describe("sessão do painel (cookie assinado)", () => {
  it("vale com a mesma senha e cai quando a senha muda", () => {
    const token = criarSessao("senha-1");
    expect(sessaoValida(token, "senha-1")).toBe(true);
    expect(sessaoValida(token, "senha-2")).toBe(false);
  });

  it("expira depois do prazo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
    const token = criarSessao("senha");
    vi.setSystemTime(new Date(Date.now() + (DIAS_SESSAO + 1) * 24 * 3600 * 1000));
    expect(sessaoValida(token, "senha")).toBe(false);
  });

  it("recusa validade esticada, assinatura trocada e lixo", () => {
    const [validade, sig] = criarSessao("senha").split(".");
    expect(sessaoValida(`${Number(validade) + 86_400_000}.${sig}`, "senha")).toBe(false);
    expect(sessaoValida(`${validade}.${"0".repeat(sig.length)}`, "senha")).toBe(false);
    expect(sessaoValida("abc", "senha")).toBe(false);
    expect(sessaoValida(undefined, "senha")).toBe(false);
    expect(sessaoValida(criarSessao("senha"), "")).toBe(false);
  });
});

describe("senhaConfere", () => {
  it("compara a senha digitada e recusa senha vazia configurada", () => {
    expect(senhaConfere("cf-abc", "cf-abc")).toBe(true);
    expect(senhaConfere("cf-abd", "cf-abc")).toBe(false);
    expect(senhaConfere("", "")).toBe(false);
  });
});

describe("ehLocal", () => {
  it("reconhece só o próprio computador", () => {
    for (const h of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "LOCALHOST"]) expect(ehLocal(h)).toBe(true);
    for (const h of ["painel.trycloudflare.com", "commentflow.onrender.com", null]) expect(ehLocal(h)).toBe(false);
    for (const h of ["localhost.evil.com", "127.0.0.1.nip.io", "localhost:3000.evil.com", "[::1].evil.com"]) expect(ehLocal(h)).toBe(false);
  });
});
