import { processarAgendados } from "@/lib/motor";

/**
 * O agendador do construtor visual: a cada 30 s, quem terminou um passo de
 * "espera" continua o fluxo. Fica no próprio processo do Next (sem serviço
 * extra); com o servidor desligado, as esperas continuam quando ele voltar.
 */
const g = globalThis as unknown as { __agendadorCommentflow?: NodeJS.Timeout };
if (!g.__agendadorCommentflow) {
  g.__agendadorCommentflow = setInterval(() => {
    processarAgendados().catch((e) => console.error("agendador", e));
  }, 30_000);
}
