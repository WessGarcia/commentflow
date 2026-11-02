/** Minúsculas e sem acento: "Preço", "PRECO" e "preço" viram "preco". */
export const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** O comentário contém alguma das palavras-chave, sem ligar para maiúscula nem acento. */
export function temPalavra(texto: string, palavras: string[]) {
  const t = normalizar(texto);
  return palavras.some((p) => t.includes(normalizar(p)));
}
