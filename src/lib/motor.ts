import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getActiveCredentials } from "@/lib/credentials";
import { sendRaw, templateComBotoes, type BotaoTemplate, type GraphResult, type IgCredentials } from "@/lib/meta";
import { asGrafo, type Grafo, type No, type NoDe } from "@/lib/grafo";
import { registrarEnvio } from "@/lib/conversas";

/**
 * O motor do construtor visual. Cada pessoa que entra numa automação vira
 * uma Execucao que anda pelo grafo:
 *
 *   mensagem com botão/resposta rápida  para e espera o toque (aguardando)
 *   atraso                              agenda e para (espera); o agendador continua
 *   coleta                              pergunta e para (coleta); a resposta continua
 *   condição, sorteio, etiqueta         decidem na hora e seguem
 *
 * Regras da Meta que valem aqui: a primeira mensagem é a resposta privada
 * ao comentário (um envio só) e, depois dela, só dá para mandar outra quando
 * a pessoa responder ou tocar num botão; a conversa fica aberta 24 h após a
 * última mensagem dela. Fora disso, a execução para com "parada_janela".
 */

type Exec = Prisma.ExecucaoGetPayload<{ include: { flow: true } }>;
const LIMITE_PASSOS = 40;

// ------------------------------------------------------------ payload dos toques
export const payloadDe = (execId: string, destino: string | null) => `g::${execId}::${destino ?? ""}`;
export function lerPayload(p: string): { execId: string; destino: string | null } | null {
  const [pre, execId, destino] = p.split("::");
  if (pre !== "g" || !execId) return null;
  return { execId, destino: destino || null };
}

// ------------------------------------------------------------ links rastreados
/** O endereço público do painel: APP_URL, ou a origem do META_REDIRECT_URI. */
export function enderecoPublico(): string | null {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  try {
    return env.metaRedirectUri ? new URL(env.metaRedirectUri).origin : null;
  } catch {
    return null;
  }
}

async function rastrear(url: string, exec: Exec): Promise<string> {
  const base = enderecoPublico();
  if (!base) return url;
  const c = await prisma.clique.create({ data: { url, execucaoId: exec.id, igsid: exec.igsid, flowId: exec.flowId } });
  return `${base}/r/${c.id}`;
}

async function rastrearTexto(texto: string, exec: Exec): Promise<string> {
  const urls = texto.match(/https?:\/\/[^\s<>"]+/g) ?? [];
  let saida = texto;
  for (const u of Array.from(new Set(urls))) saida = saida.split(u).join(await rastrear(u, exec));
  return saida;
}

// ------------------------------------------------------------ envio
function falhaDaJanela(r: GraphResult) {
  const e = (r.body as { error?: { code?: number; error_subcode?: number; message?: string } } | null)?.error;
  return e?.code === 10 || e?.error_subcode === 2018278 || /outside of allowed window|janela/i.test(e?.message ?? "");
}

/** Monta os envios de uma mensagem. A primeira (resposta privada) sempre vira UM envio. */
async function montarMensagem(no: NoDe<"mensagem">, exec: Exec, primeira: boolean): Promise<Record<string, unknown>[]> {
  const texto = no.texto.trim() ? await rastrearTexto(no.texto.trim(), exec) : "";
  const rapidas = no.respostas_rapidas.map((r) => ({ content_type: "text", title: r.titulo, payload: payloadDe(exec.id, r.proximo) }));
  const comRapidas = (m: Record<string, unknown>) => (rapidas.length ? { ...m, quick_replies: rapidas } : m);

  if (no.botoes.length) {
    const botoes: BotaoTemplate[] = [];
    for (const b of no.botoes) {
      if (b.tipo === "url") botoes.push({ type: "web_url", url: await rastrear(b.url.trim(), exec), title: b.titulo });
      else botoes.push({ type: "postback", payload: payloadDe(exec.id, b.proximo), title: b.titulo });
    }
    const cabe = texto.length <= 80;
    const cartao = templateComBotoes(cabe ? texto || "👇" : "👇", botoes, no.imagem_url.trim() || undefined);
    if (cabe || primeira) return [cartao];
    return [{ text: texto }, cartao];
  }
  if (no.imagem_url.trim() && !primeira) {
    const imagem = { attachment: { type: "image", payload: { url: no.imagem_url.trim() } } };
    return texto ? [imagem, comRapidas({ text: texto })] : [comRapidas(imagem)];
  }
  return [comRapidas({ text: texto || "👋" })];
}

/** Manda os envios de uma mensagem e registra na conversa. false = parou (motivo já gravado). */
async function enviarMensagem(no: NoDe<"mensagem">, exec: Exec, creds: IgCredentials, logPrimeira: boolean): Promise<boolean> {
  const primeira = !exec.privadaUsada && Boolean(exec.commentId);
  const envios = await montarMensagem(no, exec, primeira);
  for (const m of envios) {
    const usarPrivada = !exec.privadaUsada && Boolean(exec.commentId);
    const r = await sendRaw(creds, usarPrivada ? { comment_id: exec.commentId! } : { id: exec.igsid }, m);
    const texto = typeof m.text === "string" ? m.text : no.texto || "📎 mensagem com botões";
    await registrarEnvio(r, exec.igsid, texto);
    await prisma.activityLog.create({
      data: { type: r.ok ? (logPrimeira ? "dm_flow" : "dm_step") : logPrimeira ? "dm_flow_error" : "dm_step_error", commentId: exec.commentId, flowId: exec.flowId, detail: r as unknown as object },
    });
    if (!r.ok) {
      await parar(exec.id, falhaDaJanela(r) ? "parada_janela" : "erro", JSON.stringify((r.body as { error?: unknown } | null)?.error ?? r.status).slice(0, 500));
      return false;
    }
    if (usarPrivada) {
      exec.privadaUsada = true;
      await prisma.execucao.update({ where: { id: exec.id }, data: { privadaUsada: true } });
    }
    logPrimeira = false;
  }
  return true;
}

async function enviarTexto(texto: string, exec: Exec, creds: IgCredentials) {
  const r = await sendRaw(creds, { id: exec.igsid }, { text: texto });
  await registrarEnvio(r, exec.igsid, texto);
  if (!r.ok) await parar(exec.id, falhaDaJanela(r) ? "parada_janela" : "erro", "falha ao mandar a pergunta");
  return r.ok;
}

function parar(id: string, status: string, erro?: string) {
  return prisma.execucao.update({ where: { id }, data: { status, erro: erro ?? null, proximaEm: null } });
}

// ------------------------------------------------------------ decisões
async function testar(no: NoDe<"condicao">, exec: Exec): Promise<boolean> {
  if (no.teste === "respondeu") {
    const c = await prisma.contact.findUnique({ where: { igsid: exec.igsid }, select: { id: true } });
    if (!c) return false;
    return (await prisma.message.count({ where: { contactId: c.id, direcao: "entrada", origem: "pessoa", createdAt: { gt: exec.createdAt } } })) > 0;
  }
  if (no.teste === "clicou") return (await prisma.clique.count({ where: { execucaoId: exec.id, cliques: { gt: 0 } } })) > 0;
  const c = await prisma.contact.findUnique({ where: { igsid: exec.igsid }, select: { tags: true } });
  return Boolean(c?.tags.includes(no.tag.trim().toLowerCase().replace(/\s+/g, "_")));
}

function sortear(no: NoDe<"randomizador">): string | null {
  const total = no.ramos.reduce((a, r) => a + r.peso, 0);
  let x = Math.random() * total;
  for (const r of no.ramos) { x -= r.peso; if (x <= 0) return r.proximo; }
  return no.ramos[no.ramos.length - 1].proximo;
}

async function mexerNaEtiqueta(no: NoDe<"acao">, igsid: string) {
  const tag = no.tag.trim().toLowerCase().replace(/\s+/g, "_");
  const c = await prisma.contact.upsert({ where: { igsid }, update: {}, create: { igsid } });
  const tags = no.acao === "adicionar_tag" ? Array.from(new Set([...c.tags, tag])) : c.tags.filter((t) => t !== tag);
  await prisma.contact.update({ where: { id: c.id }, data: { tags } });
}

// ------------------------------------------------------------ andar
/** Anda pelo grafo a partir de um passo até precisar esperar algo ou acabar. */
export async function andar(execId: string, desde: string | null): Promise<void> {
  const exec = await prisma.execucao.findUnique({ where: { id: execId }, include: { flow: true } });
  if (!exec) return;
  const grafo = asGrafo(exec.flow.grafo);
  if (!grafo || !exec.flow.enabled) { await parar(exec.id, "concluida"); return; }
  const creds = await getActiveCredentials();
  if (!creds.accessToken) { await parar(exec.id, "erro", "nenhum Instagram conectado"); return; }

  const porId = new Map(grafo.nos.map((n) => [n.id, n] as const));
  let atual = desde;
  // a primeira mensagem de uma execução nova conta como "dm_flow" nas métricas
  let primeiraLog = !exec.privadaUsada;
  for (let i = 0; atual && i < LIMITE_PASSOS; i++) {
    const no: No | undefined = porId.get(atual);
    if (!no) break;
    await prisma.execucao.update({ where: { id: exec.id }, data: { noAtual: no.id, status: "andando" } });

    switch (no.tipo) {
      case "mensagem": {
        if (!(await enviarMensagem(no, exec, creds, primeiraLog))) return;
        primeiraLog = false;
        const esperaToque = no.respostas_rapidas.length > 0 || no.botoes.some((b) => b.tipo === "proximo");
        if (esperaToque) { await prisma.execucao.update({ where: { id: exec.id }, data: { status: "aguardando" } }); return; }
        atual = no.proximo;
        break;
      }
      case "atraso":
        if (!no.proximo) { atual = null; break; }
        await prisma.execucao.update({ where: { id: exec.id }, data: { status: "espera", noAtual: no.proximo, proximaEm: new Date(Date.now() + no.minutos * 60_000) } });
        return;
      case "condicao":
        atual = (await testar(no, exec)) ? no.sim : no.nao;
        break;
      case "randomizador":
        atual = sortear(no);
        break;
      case "acao":
        await mexerNaEtiqueta(no, exec.igsid);
        atual = no.proximo;
        break;
      case "coleta":
        if (!(await enviarTexto(no.pergunta, exec, creds))) return;
        await prisma.execucao.update({ where: { id: exec.id }, data: { status: "coleta", noAtual: no.id } });
        return;
    }
  }
  await prisma.execucao.update({ where: { id: exec.id }, data: { status: "concluida", noAtual: null, proximaEm: null } });
}

// ------------------------------------------------------------ entradas
/** Um comentário bateu numa automação com grafo: começa a execução. Devolve as ações para o log. */
export async function iniciarExecucao(flow: { id: string; grafo: unknown }, c: { commentId: string | null; fromUserId?: string | null }): Promise<string[]> {
  const grafo: Grafo | null = asGrafo(flow.grafo);
  if (!grafo || !c.fromUserId) return [];
  const exec = await prisma.execucao.create({ data: { flowId: flow.id, igsid: c.fromUserId, commentId: c.commentId, noAtual: grafo.inicio } });
  await andar(exec.id, grafo.inicio);
  const fim = await prisma.execucao.findUnique({ where: { id: exec.id }, select: { privadaUsada: true, status: true } });
  const ok = c.commentId ? fim?.privadaUsada : fim && fim.status !== "erro" && fim.status !== "parada_janela";
  return [ok ? "dm_flow" : "dm_flow_error"];
}

/** A pessoa tocou num botão ou resposta rápida do construtor. */
export async function tocou(payload: string): Promise<boolean> {
  const p = lerPayload(payload);
  if (!p) return false;
  const exec = await prisma.execucao.findUnique({ where: { id: p.execId } });
  if (!exec) return true;
  if (!p.destino) { await parar(exec.id, "concluida"); return true; }
  await andar(exec.id, p.destino);
  return true;
}

function valida(campo: NoDe<"coleta">["campo"], texto: string): string | null {
  const t = texto.trim();
  if (campo === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) ? t.toLowerCase() : null;
  if (campo === "telefone") { const d = t.replace(/\D/g, ""); return d.length >= 10 && d.length <= 13 ? d : null; }
  return t ? t.slice(0, 500) : null;
}

/** Texto que a pessoa mandou no direct: responde uma coleta em aberto, se houver. */
export async function receberTexto(igsid: string, texto: string): Promise<boolean> {
  const exec = await prisma.execucao.findFirst({ where: { igsid, status: "coleta" }, orderBy: { updatedAt: "desc" }, include: { flow: true } });
  if (!exec || !exec.noAtual) return false;
  const no = asGrafo(exec.flow.grafo)?.nos.find((n) => n.id === exec.noAtual);
  if (!no || no.tipo !== "coleta") return false;
  const valor = valida(no.campo, texto);
  const creds = await getActiveCredentials();
  if (!valor) {
    if (creds.accessToken) await enviarTexto(no.erro, exec, creds);
    return true;
  }
  const c = await prisma.contact.upsert({ where: { igsid }, update: {}, create: { igsid } });
  const dados = no.campo === "email" ? { email: valor } : no.campo === "telefone" ? { telefone: valor } : { notas: [c.notas, `${no.pergunta} → ${valor}`].filter(Boolean).join("\n") };
  await prisma.contact.update({ where: { id: c.id }, data: dados });
  await andar(exec.id, no.proximo);
  return true;
}

/** O agendador chama a cada 30 s: continua quem terminou de esperar. */
export async function processarAgendados() {
  const prontas = await prisma.execucao.findMany({ where: { status: "espera", proximaEm: { lte: new Date() } }, take: 50, select: { id: true, noAtual: true } });
  for (const e of prontas) {
    // trava: só um processo pega cada execução
    const { count } = await prisma.execucao.updateMany({ where: { id: e.id, status: "espera" }, data: { status: "andando" } });
    if (count) await andar(e.id, e.noAtual).catch((err) => console.error("agendador", e.id, err));
  }
}
