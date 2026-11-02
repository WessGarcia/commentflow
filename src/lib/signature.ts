import crypto from "node:crypto";

/**
 * Verify Meta's X-Hub-Signature-256 header against the raw request body.
 * The header looks like "sha256=<hex>" and is an HMAC-SHA256 of the raw
 * body keyed with the app secret. Accepts a list: a Meta app has two
 * secrets (Settings > Basic and the Instagram app's), and which one signs
 * the webhook depends on how the app was set up.
 */
export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | string[],
): boolean {
  const chaves = (Array.isArray(appSecret) ? appSecret : [appSecret]).filter(Boolean);
  if (!signatureHeader || !chaves.length) return false;

  const received = Buffer.from(signatureHeader);
  return chaves.some((chave) => {
    const computed = Buffer.from(
      "sha256=" + crypto.createHmac("sha256", chave).update(rawBody, "utf8").digest("hex"),
    );
    return received.length === computed.length && crypto.timingSafeEqual(received, computed);
  });
}
