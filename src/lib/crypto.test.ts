import { describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret, isEncryptionEnabled } from "@/lib/crypto";

describe("tokens criptografados em repouso (AES-256-GCM)", () => {
  it("cifra e decifra com a ENCRYPTION_KEY", () => {
    vi.stubEnv("ENCRYPTION_KEY", "chave-de-teste");
    const guardado = encryptSecret("EAAG-token-secreto");
    expect(guardado.startsWith("enc:v1:")).toBe(true);
    expect(guardado).not.toContain("token-secreto");
    expect(decryptSecret(guardado)).toBe("EAAG-token-secreto");
    expect(isEncryptionEnabled()).toBe(true);
  });

  it("usa um IV novo a cada vez", () => {
    vi.stubEnv("ENCRYPTION_KEY", "chave-de-teste");
    expect(encryptSecret("mesmo texto")).not.toBe(encryptSecret("mesmo texto"));
  });

  it("devolve null quando o valor foi adulterado ou a chave mudou", () => {
    vi.stubEnv("ENCRYPTION_KEY", "chave-de-teste");
    const guardado = encryptSecret("EAAG-token");
    const bytes = Buffer.from(guardado.slice("enc:v1:".length), "base64");
    bytes[bytes.length - 1] ^= 1;
    expect(decryptSecret("enc:v1:" + bytes.toString("base64"))).toBeNull();
    vi.stubEnv("ENCRYPTION_KEY", "outra-chave");
    expect(decryptSecret(guardado)).toBeNull();
  });

  it("sem chave: guarda como está e não decifra o que estava cifrado", () => {
    vi.stubEnv("ENCRYPTION_KEY", "chave-de-teste");
    const guardado = encryptSecret("EAAG-token");
    vi.stubEnv("ENCRYPTION_KEY", "");
    expect(isEncryptionEnabled()).toBe(false);
    expect(encryptSecret("texto")).toBe("texto");
    expect(decryptSecret(guardado)).toBeNull();
  });

  it("lê valores antigos em texto puro e trata vazio como ausente", () => {
    vi.stubEnv("ENCRYPTION_KEY", "chave-de-teste");
    expect(decryptSecret("token-legado")).toBe("token-legado");
    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret("")).toBeNull();
  });
});
