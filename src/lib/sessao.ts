import crypto from "node:crypto";

/**
 * Senha do painel. Sem PAINEL_SENHA o painel só abre no próprio computador
 * (localhost); com ela, quem entra recebe um cookie assinado que vale 30 dias.
 * O cookie é "validade.assinatura": trocar a senha derruba todas as sessões.
 */
export const COOKIE_SESSAO = "cf_sessao";
export const DIAS_SESSAO = 30;

export const senhaDoPainel = () => process.env.PAINEL_SENHA ?? "";

function assinatura(validade: number, senha: string) {
  return crypto.createHmac("sha256", senha).update(`commentflow-painel:${validade}`).digest("hex");
}

export function criarSessao(senha: string) {
  const validade = Date.now() + DIAS_SESSAO * 24 * 3600 * 1000;
  return `${validade}.${assinatura(validade, senha)}`;
}

export function sessaoValida(token: string | undefined, senha: string) {
  if (!token || !senha) return false;
  const [v, sig] = token.split(".");
  const validade = Number(v);
  if (!sig || !Number.isFinite(validade) || validade < Date.now()) return false;
  const esperado = Buffer.from(assinatura(validade, senha));
  const recebido = Buffer.from(sig);
  return esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido);
}

/** Compara a senha digitada sem vazar, pelo tempo, quantas letras acertou. */
export function senhaConfere(digitada: string, senha: string) {
  const a = crypto.createHash("sha256").update(digitada).digest();
  const b = crypto.createHash("sha256").update(senha).digest();
  return senha.length > 0 && crypto.timingSafeEqual(a, b);
}

/** O painel está sendo aberto no próprio computador? */
export function ehLocal(host: string | null) {
  const h = (host ?? "").toLowerCase();
  return h.startsWith("localhost") || h.startsWith("127.0.0.1") || h.startsWith("[::1]");
}
