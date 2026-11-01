import { describe, expect, it } from "vitest";
import { precisaRenovar } from "./credentials";

const DIA = 86_400_000;
const agora = Date.UTC(2026, 10, 1);

describe("precisaRenovar (token de 60 dias do login do Instagram)", () => {
  it("token novo (vence em 59 dias) não renova", () => {
    expect(precisaRenovar(new Date(agora + 59 * DIA), agora)).toBe(false);
  });
  it("faltando menos de 30 dias, renova", () => {
    expect(precisaRenovar(new Date(agora + 29 * DIA), agora)).toBe(true);
  });
  it("já vencido não renova (a Meta recusa; precisa reconectar)", () => {
    expect(precisaRenovar(new Date(agora - DIA), agora)).toBe(false);
  });
  it("sem data (token colado à mão no .env) não renova", () => {
    expect(precisaRenovar(null, agora)).toBe(false);
  });
});
