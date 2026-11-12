import { afterEach, describe, expect, it, vi } from "vitest";

const avisarReconexao = vi.fn();
vi.mock("@/lib/notificacoes", () => ({ avisarReconexao }));
vi.mock("@/lib/credentials", () => ({ getActiveCredentials: async () => ({ accessToken: "tok", igUserId: "1" }) }));

const { GET } = await import("./route");
const { publicacoesDaResposta } = await import("@/lib/meta");

const responder = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.restoreAllMocks());

describe("publicações para escolher o post da automação", () => {
  it("lista posts e reels com miniatura, legenda e data", async () => {
    const f = responder(200, {
      data: [
        { id: "111", caption: "comenta teste", media_type: "VIDEO", media_product_type: "REELS", media_url: "v.mp4", thumbnail_url: "capa.jpg", timestamp: "2026-11-01T12:00:00+0000" },
        { id: "222", media_type: "IMAGE", media_product_type: "FEED", media_url: "foto.jpg" },
      ],
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      itens: [
        { id: "111", legenda: "comenta teste", imagem: "capa.jpg", reels: true, quando: "2026-11-01T12:00:00+0000" },
        { id: "222", legenda: "", imagem: "foto.jpg", reels: false, quando: null },
      ],
    });
    expect(String(f.mock.calls[0][0])).toContain("/1/media?");
  });

  it("token vencido vira aviso para conectar de novo", async () => {
    responder(400, { error: { code: 190, message: "Error validating access token" } });
    const res = await GET();
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/conecte a conta de novo/);
    expect(avisarReconexao).toHaveBeenCalled();
  });

  it("recusa resposta fora do formato e ID estranho", () => {
    expect(publicacoesDaResposta({ erro: true })).toBeNull();
    expect(publicacoesDaResposta({ data: [{ id: "../x" }] })).toBeNull();
    expect(publicacoesDaResposta({ data: [] })).toEqual([]);
  });
});
