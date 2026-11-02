import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySignature } from "@/lib/signature";

const segredo = "0123456789abcdef0123456789abcdef";
const assinar = (corpo: string, chave = segredo) =>
  "sha256=" + crypto.createHmac("sha256", chave).update(corpo, "utf8").digest("hex");

describe("verifySignature (X-Hub-Signature-256 da Meta)", () => {
  const corpo = JSON.stringify({ object: "instagram", entry: [{ id: "1", changes: [{ field: "comments" }] }] });

  it("aceita o corpo assinado com a chave do app", () => {
    expect(verifySignature(corpo, assinar(corpo), segredo)).toBe(true);
  });

  it("recusa corpo alterado depois de assinado", () => {
    expect(verifySignature(corpo.replace("comments", "messages"), assinar(corpo), segredo)).toBe(false);
  });

  it("recusa assinatura feita com outra chave", () => {
    expect(verifySignature(corpo, assinar(corpo, "outra-chave"), segredo)).toBe(false);
  });

  it("aceita qualquer uma das chaves da lista e ignora a vazia", () => {
    expect(verifySignature(corpo, assinar(corpo, "chave-basico"), [segredo, "chave-basico"])).toBe(true);
    expect(verifySignature(corpo, assinar(corpo), [segredo, ""])).toBe(true);
    expect(verifySignature(corpo, assinar(corpo, "outra-chave"), [segredo, "chave-basico"])).toBe(false);
    expect(verifySignature(corpo, assinar(corpo), ["", ""])).toBe(false);
  });

  it("recusa sem cabeçalho, sem chave ou com tamanho diferente", () => {
    expect(verifySignature(corpo, null, segredo)).toBe(false);
    expect(verifySignature(corpo, assinar(corpo), "")).toBe(false);
    expect(verifySignature(corpo, "sha256=abc", segredo)).toBe(false);
  });

  it("assina os bytes UTF-8 (acentos e emoji)", () => {
    const comAcento = JSON.stringify({ texto: "quero o link 🔥 ação" });
    expect(verifySignature(comAcento, assinar(comAcento), segredo)).toBe(true);
  });
});
