import { z } from "zod";
import { GrafoSchema, validarGrafo } from "@/lib/grafo";

const quickReplySchema = z.object({
  title: z.string(),
  next: z.string().nullable(),
});

const flowStepSchema = z.object({
  text: z.string().trim().min(1, "Texto do passo obrigatório"),
  quickReplies: z.array(quickReplySchema).optional(),
});

export const dmFlowSchema = z
  .object({
    entry: z.string(),
    steps: z.record(flowStepSchema),
  })
  .superRefine((df, ctx) => {
    if (!df.steps[df.entry]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `entry "${df.entry}" não existe em steps`,
      });
    }
    for (const [id, step] of Object.entries(df.steps)) {
      for (const qr of step.quickReplies ?? []) {
        if (qr.next && !df.steps[qr.next]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `passo "${id}": next "${qr.next}" inexistente`,
          });
        }
      }
    }
  });

const flowCampos = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  tipo: z.enum(["comentario", "live", "story_resposta", "story_mencao", "reacao"]).optional(),
  enabled: z.boolean().optional(),
  scope: z.enum(["ALL_POSTS", "SPECIFIC_POST"]).optional(),
  mediaId: z.string().nullish(),
  matchType: z.enum(["ANY", "KEYWORD"]).optional(),
  keywords: z.array(z.string()).optional(),
  publicReplies: z.array(z.string()).optional(),
  dmMessage: z.string().nullish(),
  dmFlow: dmFlowSchema.nullish(),
  grafo: GrafoSchema.nullish(),
});

function checarGrafo(f: { tipo?: string; grafo?: z.infer<typeof GrafoSchema> | null }, ctx: z.RefinementCtx) {
  if (!f.grafo) return;
  // comentário e live respondem com a resposta privada: o 1º passo tem regra própria
  const privada = !f.tipo || f.tipo === "comentario" || f.tipo === "live";
  for (const erro of validarGrafo(f.grafo, privada)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: erro, path: ["grafo"] });
}

export const flowInputSchema = flowCampos.superRefine(checarGrafo);
export const flowPatchSchema = flowCampos.partial().superRefine(checarGrafo);

export type FlowInput = z.infer<typeof flowInputSchema>;
