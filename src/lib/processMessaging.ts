import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActiveCredentials } from "@/lib/credentials";
import { sendDm } from "@/lib/meta";
import { asDmFlow, buildStepMessage, decodePayload } from "@/lib/flowTypes";
import { estaBloqueado, registrarEnvio } from "@/lib/conversas";

export interface IncomingMessaging {
  senderId?: string;
  payload?: string; // quick_reply or postback payload
  mid?: string; // message id, used for idempotency
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Handle a quick-reply / postback tap: look up the target step and send it.
 * The payload itself carries the flow + next step, so no server-side session
 * is needed to advance the conversation.
 */
export async function processMessaging(e: IncomingMessaging) {
  if (!e.senderId || !e.payload) return { skipped: "no-payload" };
  if (await estaBloqueado(e.senderId)) return { skipped: "blocked-contact" };

  const decoded = decodePayload(e.payload);
  if (!decoded || !decoded.stepId) return { skipped: "unknown-payload" };

  const flow = await prisma.flow.findUnique({ where: { id: decoded.flowId } });
  if (!flow || !flow.enabled) return { skipped: "no-flow" };

  const dmFlow = asDmFlow(flow.dmFlow);
  if (!dmFlow) return { skipped: "no-dmflow" };

  const msg = buildStepMessage(flow.id, dmFlow, decoded.stepId);
  if (!msg) return { skipped: "no-step" };

  const creds = await getActiveCredentials();
  if (!creds.accessToken) {
    await prisma.activityLog.create({
      data: { type: "no_credentials", flowId: flow.id },
    });
    return { skipped: "no-credentials" };
  }

  // Idempotency: claim this event once. Redelivered events collide on the
  // unique key and are skipped (no duplicate step DMs).
  const key = `msg:${e.mid ?? `${e.senderId}:${e.payload}`}`;
  try {
    await prisma.processedEvent.create({ data: { key } });
  } catch (err) {
    if (isUniqueViolation(err)) return { skipped: "duplicate-event" };
    throw err;
  }

  const r = await sendDm(creds, { id: e.senderId }, msg.text, msg.quickReplies);
  await registrarEnvio(r, e.senderId, msg.text);
  await prisma.activityLog.create({
    data: {
      type: r.ok ? "dm_step" : "dm_step_error",
      flowId: flow.id,
      detail: r as unknown as object,
    },
  });

  // If the send failed, release the claim so a redelivery can retry.
  if (!r.ok) {
    await prisma.processedEvent
      .delete({ where: { key } })
      .catch(() => undefined);
  }

  return { ok: r.ok, step: decoded.stepId };
}
