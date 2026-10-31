import { describe, expect, it } from "vitest";
import { ehEtapa, etapaDerivada, etapaDoContato } from "@/lib/quadro";

describe("colunas do quadro de contatos", () => {
  it("o contato anda sozinho: clicou > respondeu > recebeu > comentou", () => {
    expect(etapaDerivada({ recebeu: false, respondeu: false })).toBe("comentou");
    expect(etapaDerivada({ recebeu: true, respondeu: false })).toBe("recebeu");
    expect(etapaDerivada({ recebeu: true, respondeu: true })).toBe("respondeu");
    expect(etapaDerivada({ recebeu: true, respondeu: true, clicou: true })).toBe("clicou");
  });

  it("colunas de decisão sua vencem o automático", () => {
    expect(etapaDoContato({ recebeu: true, respondeu: true, clicou: true, etapa: "perdeu" })).toBe("perdeu");
    expect(etapaDoContato({ recebeu: false, respondeu: false, etapa: "cliente" })).toBe("cliente");
  });

  it("arrastar para uma coluna automática não segura o cartão atrás do que aconteceu", () => {
    expect(etapaDoContato({ recebeu: true, respondeu: false, etapa: "respondeu" })).toBe("respondeu");
    expect(etapaDoContato({ recebeu: true, respondeu: true, clicou: true, etapa: "recebeu" })).toBe("clicou");
  });

  it("etapa desconhecida (ex.: 'novo') volta para o automático", () => {
    expect(ehEtapa("novo")).toBe(false);
    expect(etapaDoContato({ recebeu: true, respondeu: false, etapa: "novo" })).toBe("recebeu");
    expect(etapaDoContato({ recebeu: false, respondeu: false, etapa: null })).toBe("comentou");
  });
});
