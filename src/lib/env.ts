/**
 * Centralized access to environment variables.
 * Read lazily so `next build` works even without credentials.
 */
export const env = {
  get metaAppId() {
    return process.env.META_APP_ID ?? "";
  },
  get metaAppSecret() {
    return process.env.META_APP_SECRET ?? "";
  },
  get metaRedirectUri() {
    return process.env.META_REDIRECT_URI ?? "";
  },
  get igVerifyToken() {
    return process.env.IG_VERIFY_TOKEN ?? "";
  },
  get igAccessToken() {
    return process.env.IG_ACCESS_TOKEN ?? "";
  },
  get igUserId() {
    return process.env.IG_USER_ID ?? "";
  },
  /** Só para testes: aponta as chamadas da Graph API para outro servidor. */
  get graphBaseUrl() {
    return (process.env.GRAPH_BASE_URL || "https://graph.facebook.com").replace(/\/$/, "");
  },
  get graphVersion() {
    return process.env.GRAPH_API_VERSION ?? "v26.0";
  },
  get encryptionKey() {
    return process.env.ENCRYPTION_KEY ?? "";
  },
};
