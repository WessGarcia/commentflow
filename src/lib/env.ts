import { configMeta } from "@/lib/configMeta";

/**
 * Centralized access to environment variables.
 * Read lazily so `next build` works even without credentials.
 * Meta keys and the public address saved by the panel wizard (configMeta,
 * loaded with carregarConfigMeta()) win over the .env.
 */
export const env = {
  get metaAppId() {
    return configMeta.appId || process.env.META_APP_ID || "";
  },
  get metaAppSecret() {
    return configMeta.appSecret || process.env.META_APP_SECRET || "";
  },
  get metaRedirectUri() {
    if (configMeta.endereco) return `${configMeta.endereco}/api/auth/meta/callback`;
    return process.env.META_REDIRECT_URI ?? "";
  },
  /** Public address of the panel (tracked links, wizard). */
  get enderecoPublico() {
    if (configMeta.endereco) return configMeta.endereco;
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
    try {
      return process.env.META_REDIRECT_URI ? new URL(process.env.META_REDIRECT_URI).origin : "";
    } catch {
      return "";
    }
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
