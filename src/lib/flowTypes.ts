// Shared types + helpers for the multi-step DM flow (quick replies).

export interface QuickReplyDef {
  title: string;
  next: string | null; // target step id, or null to end the flow
}

export interface FlowStep {
  text: string;
  quickReplies?: QuickReplyDef[];
}

export interface DmFlow {
  entry: string;
  steps: Record<string, FlowStep>;
}

export interface QuickReplyOut {
  title: string;
  payload: string;
}

export interface OutboundMessage {
  text: string;
  quickReplies: QuickReplyOut[];
}

const PREFIX = "qr";
// Instagram quick-reply title limit is 20 characters.
const TITLE_MAX = 20;
// Instagram allows at most 13 quick replies per message.
const MAX_QUICK_REPLIES = 13;

export function encodePayload(flowId: string, stepId: string): string {
  return `${PREFIX}::${flowId}::${stepId}`;
}

export function decodePayload(
  payload: string,
): { flowId: string; stepId: string } | null {
  const parts = payload.split("::");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  return { flowId: parts[1], stepId: parts[2] };
}

/** Safely coerce an unknown (e.g. a Prisma Json value) into a DmFlow. */
export function asDmFlow(value: unknown): DmFlow | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { entry?: unknown; steps?: unknown };
  if (typeof v.entry !== "string") return null;
  if (!v.steps || typeof v.steps !== "object") return null;
  return value as DmFlow;
}

/** Build the outbound message for one step (text + quick replies with payloads). */
export function buildStepMessage(
  flowId: string,
  flow: DmFlow,
  stepId: string,
): OutboundMessage | null {
  const step = flow.steps?.[stepId];
  if (!step) return null;
  // Instagram requires non-empty message text; skip an empty step rather than
  // sending a message the API would reject.
  const text = step.text?.trim() ? step.text : "";
  if (!text) return null;
  const quickReplies = (step.quickReplies ?? [])
    .filter((q) => q.title?.trim())
    .slice(0, MAX_QUICK_REPLIES)
    .map((q) => ({
      title: q.title.trim().slice(0, TITLE_MAX),
      payload: encodePayload(flowId, q.next ?? ""),
    }));
  return { text, quickReplies };
}

/** Uma automação como o painel recebe do servidor. */
export interface FlowDTO {
  id: string;
  name: string;
  tipo: string;
  enabled: boolean;
  scope: "ALL_POSTS" | "SPECIFIC_POST";
  mediaId: string | null;
  matchType: "ANY" | "KEYWORD";
  keywords: string[];
  publicReplies: string[];
  dmMessage: string | null;
  dmFlow: DmFlow | null;
  grafo: unknown;
}

export function toFlowDTO(f: Omit<FlowDTO, "dmFlow" | "grafo" | "tipo"> & { dmFlow: unknown; grafo?: unknown; tipo?: string }): FlowDTO {
  return {
    id: f.id,
    name: f.name,
    tipo: f.tipo ?? "comentario",
    enabled: f.enabled,
    scope: f.scope,
    mediaId: f.mediaId,
    matchType: f.matchType,
    keywords: f.keywords,
    publicReplies: f.publicReplies,
    dmMessage: f.dmMessage,
    dmFlow: asDmFlow(f.dmFlow),
    grafo: f.grafo ?? null,
  };
}
