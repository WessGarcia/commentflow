/**
 * Roda uma vez quando o servidor sobe. Liga o agendador do construtor
 * visual (src/agendador.ts). O import fica dentro do if para o Next não
 * levar código de Node para o runtime edge.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./agendador");
  }
}
