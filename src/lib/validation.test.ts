import { describe, expect, it } from "vitest";
import { dmFlowSchema, flowInputSchema, flowPatchSchema } from "@/lib/validation";

const grafoOk = { inicio: "a", nos: [{ id: "a", tipo: "mensagem", texto: "Oi" }] };

describe("validação das automações (API /api/flows)", () => {
  it("aceita o mínimo e preenche o grafo", () => {
    const r = flowInputSchema.safeParse({ name: "Link do ebook", keywords: ["ebook"], grafo: grafoOk });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.grafo?.nos[0]).toMatchObject({ botoes: [], proximo: null });
  });

  it("exige nome", () => {
    expect(flowInputSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("leva os erros do grafo para o campo grafo", () => {
    const r = flowInputSchema.safeParse({ name: "x", grafo: { inicio: "zz", nos: grafoOk.nos } });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["grafo"]);
      expect(r.error.issues.map((i) => i.message)).toContain("O fluxo precisa de um primeiro passo.");
    }
  });

  it("story: o primeiro passo não é resposta privada", () => {
    const g = { inicio: "a", nos: [{ id: "a", tipo: "mensagem", texto: "x", imagem_url: "https://exemplo.com/a.png" }] };
    expect(flowInputSchema.safeParse({ name: "x", tipo: "comentario", grafo: g }).success).toBe(false);
    expect(flowInputSchema.safeParse({ name: "x", tipo: "story_resposta", grafo: g }).success).toBe(true);
  });

  it("PATCH aceita só um campo e continua checando o grafo", () => {
    expect(flowPatchSchema.safeParse({ enabled: false }).success).toBe(true);
    expect(flowPatchSchema.safeParse({ grafo: { inicio: "zz", nos: grafoOk.nos } }).success).toBe(false);
  });

  it("recusa tipo de gatilho desconhecido", () => {
    expect(flowInputSchema.safeParse({ name: "x", tipo: "tiktok" }).success).toBe(false);
  });
});

describe("dmFlowSchema (conversa antiga com botões)", () => {
  it("aceita passos ligados", () => {
    expect(dmFlowSchema.safeParse({ entry: "s1", steps: { s1: { text: "Oi", quickReplies: [{ title: "Sim", next: "s2" }] }, s2: { text: "Ok" } } }).success).toBe(true);
  });

  it("recusa entrada ou próximo inexistentes e texto vazio", () => {
    expect(dmFlowSchema.safeParse({ entry: "x", steps: { s1: { text: "Oi" } } }).success).toBe(false);
    expect(dmFlowSchema.safeParse({ entry: "s1", steps: { s1: { text: "Oi", quickReplies: [{ title: "Sim", next: "s9" }] } } }).success).toBe(false);
    expect(dmFlowSchema.safeParse({ entry: "s1", steps: { s1: { text: "  " } } }).success).toBe(false);
  });
});
