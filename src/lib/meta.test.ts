import { describe, expect, it } from "vitest";
import { buildMessage } from "@/lib/meta";

describe("botão do direct", () => {
  it("até 3 botões curtos ficam dentro do balão, embaixo do texto", () => {
    expect(buildMessage("Preparei um texto. Toque abaixo pra receber.", [{ title: "Quero ler", payload: "p1" }])).toEqual({
      attachment: {
        type: "template",
        payload: { template_type: "button", text: "Preparei um texto. Toque abaixo pra receber.", buttons: [{ type: "postback", title: "Quero ler", payload: "p1" }] },
      },
    });
  });

  it("sem botão é só texto; mais de 3 ou texto longo voltam a ser respostas rápidas", () => {
    expect(buildMessage("oi")).toEqual({ text: "oi" });
    const quatro = ["a", "b", "c", "d"].map((t) => ({ title: t, payload: t }));
    expect(buildMessage("escolha", quatro)).toMatchObject({ text: "escolha", quick_replies: expect.any(Array) });
    expect(buildMessage("x".repeat(641), [{ title: "Sim", payload: "s" }])).toMatchObject({ quick_replies: expect.any(Array) });
  });
});
