import { describe, expect, it } from "vitest";
import { asGrafo, grafoDeAntigo, GrafoSchema, ligarSaida, minutosLegivel, novoNo, saidasDoNo, validarGrafo, type Grafo } from "@/lib/grafo";

const msg = (id: string, extra: Record<string, unknown> = {}) => ({ id, tipo: "mensagem", texto: "Oi! Aqui está o link.", ...extra });
const grafo = (nos: unknown[], inicio = "a"): Grafo => GrafoSchema.parse({ inicio, nos });

describe("GrafoSchema", () => {
  it("preenche os padrões de cada passo (posição, listas vazias, próximo nulo)", () => {
    const g = grafo([msg("a"), { id: "b", tipo: "atraso", minutos: 30 }, { id: "c", tipo: "condicao", teste: "clicou" }]);
    expect(g.nos[0]).toEqual({ id: "a", tipo: "mensagem", pos: { x: 0, y: 0 }, texto: "Oi! Aqui está o link.", imagem_url: "", botoes: [], respostas_rapidas: [], proximo: null });
    expect(g.nos[1]).toMatchObject({ pos: { x: 0, y: 0 }, proximo: null });
    expect(g.nos[2]).toMatchObject({ tag: "", sim: null, nao: null });
  });

  it("preenche os padrões dentro de botões e ramos", () => {
    const g = grafo([msg("a", { botoes: [{ titulo: "Quero" }] }), { id: "r", tipo: "randomizador", ramos: [{ peso: 50 }, { peso: 50 }] }]);
    expect(g.nos[0]).toMatchObject({ botoes: [{ titulo: "Quero", tipo: "proximo", url: "", proximo: null }] });
    expect(g.nos[1]).toMatchObject({ ramos: [{ rotulo: "", peso: 50, proximo: null }, { rotulo: "", peso: 50, proximo: null }] });
  });

  it("recusa tipo desconhecido, limites estourados e grafo vazio", () => {
    expect(asGrafo({ inicio: "a", nos: [{ id: "a", tipo: "foguete" }] })).toBeNull();
    expect(asGrafo({ inicio: "a", nos: [msg("a", { botoes: [1, 2, 3, 4].map((i) => ({ titulo: `b${i}` })) })] })).toBeNull();
    expect(asGrafo({ inicio: "a", nos: [] })).toBeNull();
    expect(asGrafo({ inicio: "a", nos: [{ id: "a", tipo: "atraso", minutos: 0 }] })).toBeNull();
  });
});

describe("validarGrafo", () => {
  it("aceita um fluxo simples e bem ligado", () => {
    expect(validarGrafo(grafo([msg("a", { proximo: "b" }), { id: "b", tipo: "acao", acao: "adicionar_tag", tag: "lead" }]))).toEqual([]);
  });

  it("aponta início inexistente, ligação solta e mensagem vazia", () => {
    const erros = validarGrafo(grafo([msg("a", { proximo: "fantasma" }), msg("b", { texto: "" })], "x"));
    expect(erros).toContain("O fluxo precisa de um primeiro passo.");
    expect(erros).toContain("Um passo aponta para um passo que não existe mais.");
    expect(erros).toContain("Toda mensagem precisa de texto ou imagem.");
  });

  it("exige https nos botões de link e não mistura botões com respostas rápidas", () => {
    const erros = validarGrafo(grafo([msg("a", { botoes: [{ titulo: "Site", tipo: "url", url: "ftp://x" }], respostas_rapidas: [{ titulo: "Sim" }] })]));
    expect(erros).toContain("O botão “Site” precisa de um link começando com https://.");
    expect(erros).toContain("Uma mensagem usa botões ou respostas rápidas, não os dois.");
  });

  it("aplica a regra da resposta privada só quando ela vale", () => {
    const longo = msg("a", { texto: "x".repeat(81), botoes: [{ titulo: "Ver", tipo: "url", url: "https://exemplo.com" }] });
    expect(validarGrafo(grafo([longo]))).toContain("No primeiro passo, com botões, o texto tem até 80 caracteres (vira o título do cartão).");
    expect(validarGrafo(grafo([longo]), false)).toEqual([]);
    expect(validarGrafo(grafo([msg("a", { imagem_url: "https://exemplo.com/a.png" })]))).toContain("No primeiro passo, imagem só junto de botões. Coloque a imagem num passo depois do toque.");
  });

  it("o primeiro passo precisa ser mensagem", () => {
    expect(validarGrafo(grafo([{ id: "a", tipo: "atraso", minutos: 5 }]))).toContain("O primeiro passo precisa ser uma mensagem (é ela que responde o comentário).");
  });
});

describe("saídas e ligações", () => {
  it("lista e liga cada saída sem alterar o passo original", () => {
    const [m] = grafo([msg("a", { respostas_rapidas: [{ titulo: "Sim" }, { titulo: "Não" }] })]).nos;
    expect(saidasDoNo(m).map((s) => s.rotulo)).toEqual(["rapida:0", "rapida:1", "proximo"]);
    const ligado = ligarSaida(m, "rapida:1", "b");
    expect(saidasDoNo(ligado).find((s) => s.rotulo === "rapida:1")?.alvo).toBe("b");
    expect(saidasDoNo(m).find((s) => s.rotulo === "rapida:1")?.alvo).toBeNull();
  });

  it("condição tem sim/não e randomizador um ramo por peso", () => {
    expect(saidasDoNo(novoNo("condicao", { x: 0, y: 0 })).map((s) => s.rotulo)).toEqual(["sim", "nao"]);
    expect(saidasDoNo(novoNo("randomizador", { x: 0, y: 0 })).map((s) => s.rotulo)).toEqual(["ramo:0", "ramo:1"]);
  });

  it("todo passo novo passa no esquema", () => {
    for (const tipo of ["mensagem", "atraso", "condicao", "randomizador", "acao", "coleta"] as const) {
      expect(GrafoSchema.safeParse({ inicio: "x", nos: [novoNo(tipo, { x: 1, y: 2 })] }).success).toBe(true);
    }
  });
});

describe("automações antigas", () => {
  it("direct simples vira um passo de mensagem", () => {
    expect(grafoDeAntigo({ dmMessage: "Toma o link", dmFlow: null }).nos[0]).toMatchObject({ id: "inicio", tipo: "mensagem", texto: "Toma o link" });
  });

  it("conversa com botões vira passos ligados pelas respostas rápidas", () => {
    const g = grafoDeAntigo({ dmMessage: null, dmFlow: { entry: "s1", steps: { s1: { text: "Quer?", quickReplies: [{ title: "Sim", next: "s2" }] }, s2: { text: "Aqui." } } } });
    expect(g.inicio).toBe("s1");
    expect(validarGrafo(g)).toEqual([]);
    expect(g.nos[0]).toMatchObject({ respostas_rapidas: [{ titulo: "Sim", proximo: "s2" }] });
  });
});

it("minutosLegivel", () => {
  expect([minutosLegivel(45), minutosLegivel(120), minutosLegivel(1440), minutosLegivel(2880)]).toEqual(["45 min", "2 h", "1 dia", "2 dias"]);
});
