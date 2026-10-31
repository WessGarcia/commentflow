import { env } from "@/lib/env";
import { avisarReconexao } from "@/lib/notificacoes";

const base = () => `https://graph.facebook.com/${env.graphVersion}`;

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

function buildMessage(text: string, quickReplies?: QuickReply[]) {
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
 * POST /{ig-user-id}/messages  (needs instagram_manage_messages)
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
