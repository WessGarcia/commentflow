import { z } from "zod";
import { env } from "@/lib/env";
import { avisarReconexao } from "@/lib/notificacoes";

export const base = () => `${env.graphBaseUrl}/${env.graphVersion}`;

export interface IgCredentials {
  accessToken: string;
  igUserId: string;
}

export interface QuickReply {
  title: string;
  payload: string;
}

export interface GraphResult {
  ok: boolean;
  status: number;
  body: unknown;
}

async function graphPost(
  url: string,
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<GraphResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, access_token: accessToken }),
    });
    const body = await res.json().catch(() => null);
    if ((body as { error?: { code?: number } } | null)?.error?.code === 190) void avisarReconexao();
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: { error: String(error) } };
  }
}

/** Até 3 botões curtos cabem dentro do balão (button template); senão viram respostas rápidas. */
export function buildMessage(text: string, quickReplies?: QuickReply[]) {
  const botoes = quickReplies ?? [];
  if (botoes.length > 0 && botoes.length <= 3 && text.length <= 640 && botoes.every((q) => q.title.length <= 20)) {
    return templateBotao(text, botoes.map((q) => ({ type: "postback" as const, title: q.title, payload: q.payload })));
  }
  const message: Record<string, unknown> = { text };
  if (quickReplies && quickReplies.length > 0) {
    message.quick_replies = quickReplies.map((q) => ({
      content_type: "text",
      title: q.title,
      payload: q.payload,
    }));
  }
  return message;
}

/**
 * Public reply to a comment.
 * POST /{ig-comment-id}/replies  (needs instagram_manage_comments)
 */
export function replyToComment(
  creds: IgCredentials,
  commentId: string,
  message: string,
): Promise<GraphResult> {
  return graphPost(`${base()}/${commentId}/replies`, creds.accessToken, {
    message,
  });
}

/**
 * Send a DM. recipient is either { comment_id } (private reply to a comment)
 * or { id } (a message to a user PSID, e.g. after a quick-reply tap).
 * POST /{ig-id}/messages  (needs instagram_manage_messages). No login unificado o token
 * é de usuário do sistema, então /me não é a conta do Instagram: vai o id dela.
 */
export function sendDm(
  creds: IgCredentials,
  recipient: { comment_id?: string; id?: string },
  text: string,
  quickReplies?: QuickReply[],
): Promise<GraphResult> {
  return graphPost(`${base()}/${creds.igUserId}/messages`, creds.accessToken, {
    recipient,
    messaging_type: "RESPONSE",
    message: buildMessage(text, quickReplies),
  });
}

/** Any message body (text, attachment, template) to a comment (private reply) or a user. */
export function sendRaw(
  creds: IgCredentials,
  recipient: { comment_id?: string; id?: string },
  message: Record<string, unknown>,
): Promise<GraphResult> {
  return graphPost(`${base()}/${creds.igUserId}/messages`, creds.accessToken, {
    recipient,
    messaging_type: "RESPONSE",
    message,
  });
}

export type BotaoTemplate = { type: "web_url"; url: string; title: string } | { type: "postback"; payload: string; title: string };

/** Button template: text (max 640) and up to 3 buttons inside the same bubble. */
export function templateBotao(texto: string, botoes: BotaoTemplate[]) {
  return { attachment: { type: "template", payload: { template_type: "button", text: texto.slice(0, 640), buttons: botoes.slice(0, 3) } } };
}

/** Generic template: title (max 80) + up to 3 buttons (link or postback). */
export function templateComBotoes(titulo: string, botoes: BotaoTemplate[], imagem?: string) {
  return {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements: [{ title: titulo.slice(0, 80), ...(imagem ? { image_url: imagem } : {}), buttons: botoes.slice(0, 3) }],
      },
    },
  };
}

/** Comment -> DM (private reply). Optionally with quick replies. */
export function sendPrivateReply(
  creds: IgCredentials,
  commentId: string,
  text: string,
  quickReplies?: QuickReply[],
): Promise<GraphResult> {
  return sendDm(creds, { comment_id: commentId }, text, quickReplies);
}

/**
 * Hide / unhide a comment on your own media.
 * POST /{ig-comment-id}?hide=true|false  (needs instagram_manage_comments)
 */
export function hideComment(creds: IgCredentials, commentId: string, hide: boolean): Promise<GraphResult> {
  return graphPost(`${base()}/${commentId}`, creds.accessToken, { hide });
}

export interface MediaInfo {
  legenda: string;
  imagem: string | null;
  link: string | null;
  curtidas: number;
  comentarios: number;
  quando: string | null;
}

/** The post a comment belongs to (caption, thumbnail, counts). Null when the API refuses. */
export async function getMedia(creds: IgCredentials, mediaId: string): Promise<MediaInfo | null> {
  try {
    const url = `${base()}/${mediaId}?` + new URLSearchParams({
      fields: "caption,media_type,media_url,thumbnail_url,permalink,like_count,comments_count,timestamp",
      access_token: creds.accessToken,
    });
    const r = await fetch(url);
    if (!r.ok) return null;
    const m = (await r.json()) as { caption?: string; media_type?: string; media_url?: string; thumbnail_url?: string; permalink?: string; like_count?: number; comments_count?: number; timestamp?: string };
    return {
      legenda: m.caption ?? "",
      imagem: (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ?? null,
      link: m.permalink ?? null,
      curtidas: m.like_count ?? 0,
      comentarios: m.comments_count ?? 0,
      quando: m.timestamp ?? null,
    };
  } catch {
    return null;
  }
}

export interface Publicacao {
  id: string;
  legenda: string;
  imagem: string | null;
  reels: boolean;
  quando: string | null;
}

const midiasSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().regex(/^[\w-]+$/),
      caption: z.string().optional(),
      media_type: z.string().optional(),
      media_product_type: z.string().optional(),
      media_url: z.string().optional(),
      thumbnail_url: z.string().optional(),
      timestamp: z.string().optional(),
    }),
  ),
});

/** Resposta do GET /{ig-id}/media em publicações para o seletor; null se a Meta mandou algo fora do formato. */
export function publicacoesDaResposta(body: unknown): Publicacao[] | null {
  const r = midiasSchema.safeParse(body);
  if (!r.success) return null;
  return r.data.data.map((m) => ({
    id: m.id,
    legenda: m.caption ?? "",
    imagem: (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ?? null,
    reels: m.media_product_type === "REELS",
    quando: m.timestamp ?? null,
  }));
}

/**
 * As publicações mais recentes da conta (posts e reels), para escolher o post de uma automação.
 * GET /{ig-id}/media  (instagram_basic). erro "token" = conexão vencida, precisa conectar de novo.
 */
export async function listarPublicacoes(creds: IgCredentials, limite = 24): Promise<{ itens: Publicacao[] } | { erro: "token" | "falha" }> {
  try {
    const url = `${base()}/${creds.igUserId}/media?` + new URLSearchParams({
      fields: "id,caption,media_type,media_product_type,media_url,thumbnail_url,timestamp",
      limit: String(limite),
      access_token: creds.accessToken,
    });
    const r = await fetch(url);
    const body: unknown = await r.json().catch(() => null);
    if ((body as { error?: { code?: number } } | null)?.error?.code === 190) {
      void avisarReconexao();
      return { erro: "token" };
    }
    const itens = r.ok ? publicacoesDaResposta(body) : null;
    return itens ? { itens } : { erro: "falha" };
  } catch {
    return { erro: "falha" };
  }
}
