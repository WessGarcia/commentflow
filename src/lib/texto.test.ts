import { describe, expect, it } from "vitest";
import { temPalavra } from "./texto";

describe("palavra-chave do comentário", () => {
  it("ignora maiúscula e acento dos dois lados", () => {
    for (const c of ["teste", "Teste", "TESTE", "quero o teste!", "têste"]) expect(temPalavra(c, ["Teste"])).toBe(true);
    expect(temPalavra("qual o preco?", ["preço"])).toBe(true);
    expect(temPalavra("QUAL O PREÇO", ["preco"])).toBe(true);
  });

  it("não dispara sem a palavra", () => {
    expect(temPalavra("que legal", ["teste"])).toBe(false);
    expect(temPalavra("", ["teste"])).toBe(false);
  });
});
