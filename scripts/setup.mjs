#!/usr/bin/env node
/**
 * Instalador do CommentFlow. Um comando faz tudo que dá para fazer sem a
 * pessoa: cria o .env, gera os segredos e a senha do painel, sobe o app e o
 * banco (Docker), aplica as migrações e confere se está no ar. Os outros
 * comandos gravam o que só a pessoa tem (endereço público, chaves da Meta)
 * e dizem o próximo passo.
 *
 *   node scripts/setup.mjs                      instala e liga (Docker; --local sem Docker)
 *   node scripts/setup.mjs endereco <https://…> grava o endereço público e reinicia
 *   node scripts/setup.mjs meta --app-id <id> --app-secret <chave>
 *                                               grava as chaves do app da Meta e reinicia
 *   node scripts/setup.mjs coordenadas          mostra os valores para colar na Meta
 *   node scripts/setup.mjs verificar            confere tudo e diz o próximo passo
 *   node scripts/setup.mjs senha [nova]         mostra (ou troca) a senha do painel
 *
 * Sem dependências: roda com o Node que vem com o projeto (22.19+).
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV = path.join(RAIZ, ".env");
const EXEMPLO = path.join(RAIZ, ".env.example");
const LOCAL = "http://localhost:3000";

// ---------------------------------------------------------------- .env
const PLACEHOLDERS = new Set(["your_meta_app_id", "your_meta_app_secret", "choose_a_long_random_string"]);

function lerEnv() {
  if (!fs.existsSync(ENV)) fs.copyFileSync(EXEMPLO, ENV);
  return fs.readFileSync(ENV, "utf8");
}
function pegar(chave) {
  const m = lerEnv().match(new RegExp(`^${chave}=(.*)$`, "m"));
  const v = m ? m[1].trim().replace(/^"(.*)"$/, "$1") : "";
  return PLACEHOLDERS.has(v) ? "" : v;
}
function gravar(chave, valor) {
  let s = lerEnv();
  const linha = `${chave}="${String(valor).replace(/"/g, "")}"`;
  const re = new RegExp(`^${chave}=.*$`, "m");
  s = re.test(s) ? s.replace(re, linha) : `${s.replace(/\s*$/, "")}\n${linha}\n`;
  fs.writeFileSync(ENV, s);
}

// ---------------------------------------------------------------- utilidades
const args = process.argv.slice(2);
const opcao = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
const tem = (nome) => args.includes(nome);
const ok = (t) => console.log(`  ✓ ${t}`);
const falta = (t) => console.log(`  ✗ ${t}`);
const titulo = (t) => console.log(`\n▸ ${t}`);

function rodar(cmd, cmdArgs, { mostrar = true } = {}) {
  const opcoes = { cwd: RAIZ, stdio: mostrar ? "inherit" : "pipe", encoding: "utf8" };
  // no Windows, npm/npx/docker passam pelo shell; os argumentos daqui são fixos, sem nada vindo de fora
  const r = process.platform === "win32" ? spawnSync([cmd, ...cmdArgs].join(" "), { ...opcoes, shell: true }) : spawnSync(cmd, cmdArgs, opcoes);
  return r.status === 0;
}
const temDocker = () => rodar("docker", ["info"], { mostrar: false }) && rodar("docker", ["compose", "version"], { mostrar: false });

async function buscar(url, ms = 8000) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms), redirect: "manual" });
    return { status: r.status, texto: await r.text() };
  } catch (e) {
    return { status: 0, texto: String(e?.cause?.code ?? e?.message ?? e) };
  }
}
async function esperarNoAr(segundos = 240) {
  const ate = Date.now() + segundos * 1000;
  while (Date.now() < ate) {
    const r = await buscar(`${LOCAL}/api/saude`, 5000);
    if (r.status === 200) return JSON.parse(r.texto);
    await new Promise((res) => setTimeout(res, 3000));
  }
  return null;
}
const enderecoPublico = () => (pegar("APP_URL") || (pegar("META_REDIRECT_URI") ? new URL(pegar("META_REDIRECT_URI")).origin : "")).replace(/\/$/, "");
const usaDocker = () => !tem("--local") && temDocker();

function reiniciar() {
  if (usaDocker()) {
    titulo("Reiniciando o painel para ler o .env novo");
    rodar("docker", ["compose", "up", "-d"]);
  } else {
    console.log("\n  Reinicie o servidor (pare com Ctrl+C e rode `npm run start` de novo) para ele ler o .env novo.");
  }
}

// ---------------------------------------------------------------- comandos
async function instalar() {
  console.log("CommentFlow · instalação");

  titulo("Configuração (.env)");
  lerEnv();
  for (const k of ["META_APP_ID", "META_APP_SECRET", "IG_VERIFY_TOKEN"]) if (!pegar(k)) gravar(k, "");
  if (!pegar("IG_VERIFY_TOKEN")) { gravar("IG_VERIFY_TOKEN", crypto.randomBytes(16).toString("hex")); ok("token do webhook gerado"); }
  if (!pegar("ENCRYPTION_KEY")) { gravar("ENCRYPTION_KEY", crypto.randomBytes(32).toString("base64")); ok("chave de criptografia gerada"); }
  if (!pegar("PAINEL_SENHA")) { gravar("PAINEL_SENHA", `cf-${crypto.randomBytes(9).toString("base64url")}`); ok("senha do painel gerada"); }
  ok(".env pronto (segredos guardados só neste computador)");

  if (usaDocker()) {
    titulo("Subindo o app e o banco com Docker (a primeira vez demora alguns minutos)");
    if (!rodar("docker", ["compose", "up", "-d", "--build"])) {
      falta("O Docker não conseguiu montar ou subir o CommentFlow. Leia a mensagem logo acima; se o Docker Desktop estiver fechado, abra, espere ficar verde e rode de novo.");
      process.exit(1);
    }
  } else {
    titulo("Sem Docker: instalando no próprio computador");
    const [maior, menor] = process.versions.node.split(".").map(Number);
    if (maior < 22 || (maior === 22 && menor < 19)) { falta(`Node ${process.versions.node} é antigo: instale o Node 22.19 ou mais novo.`); process.exit(1); }
    if (!pegar("DATABASE_URL")) { falta("Preencha DATABASE_URL no .env com o endereço do seu Postgres, ou instale o Docker Desktop."); process.exit(1); }
    if (!rodar("npm", ["install"]) || !rodar("npx", ["prisma", "migrate", "deploy"]) || !rodar("npm", ["run", "build"])) {
      falta("A instalação parou. Leia a mensagem acima: quase sempre é o Postgres desligado ou o DATABASE_URL errado.");
      process.exit(1);
    }
    console.log("\n  Agora ligue o servidor e deixe a janela aberta:  npm run start");
    console.log("  (depois rode `node scripts/setup.mjs verificar` em outra janela)");
    return;
  }

  titulo("Esperando o painel responder");
  const saude = await esperarNoAr();
  if (!saude) { falta("O painel não respondeu em 4 minutos. Veja o que deu errado com: docker compose logs app"); process.exit(1); }
  ok(`painel no ar em ${LOCAL}/app`);
  ok(saude.banco ? "banco de dados conectado e atualizado" : "banco ainda subindo");

  console.log(`
────────────────────────────────────────────────────────
  CommentFlow instalado.
  Painel:  ${LOCAL}/app
  Senha:   ${pegar("PAINEL_SENHA")}
────────────────────────────────────────────────────────
Próximo passo: ter um endereço público (túnel ou Render) e rodar
  node scripts/setup.mjs endereco https://SEU-ENDERECO`);
}

async function endereco() {
  const bruto = args[1];
  let url;
  try { url = new URL(bruto); } catch { falta("Passe o endereço completo, ex.: node scripts/setup.mjs endereco https://abc.trycloudflare.com"); process.exit(1); }
  if (url.protocol !== "https:") { falta("A Meta só aceita endereço com https://."); process.exit(1); }
  const base = url.origin;
  gravar("APP_URL", base);
  gravar("META_REDIRECT_URI", `${base}/api/auth/meta/callback`);
  ok(`endereço público gravado: ${base}`);
  reiniciar();
  if (usaDocker()) await esperarNoAr(120);
  await coordenadas();
}

async function meta() {
  const id = opcao("--app-id");
  const segredo = opcao("--app-secret");
  if (!id && !segredo) { falta("Use: node scripts/setup.mjs meta --app-id 123 --app-secret abc"); process.exit(1); }
  // confere os dois antes de gravar: nada fica pela metade
  if (id && !/^\d{6,20}$/.test(id)) { falta("O ID do app do Instagram tem só números (Casos de uso → API do Instagram → Configuração da API com login do Instagram)."); process.exit(1); }
  if (segredo && !/^[a-f0-9]{32}$/i.test(segredo)) { falta("A chave secreta do app do Instagram tem 32 letras e números (clique em Mostrar ao lado dela)."); process.exit(1); }
  if (id) { gravar("META_APP_ID", id); ok("ID do app gravado"); }
  if (segredo) { gravar("META_APP_SECRET", segredo); ok("chave secreta gravada (só neste computador)"); }
  reiniciar();
  if (usaDocker()) await esperarNoAr(120);
}

async function coordenadas() {
  const base = enderecoPublico();
  const token = pegar("IG_VERIFY_TOKEN");
  if (!base) { falta("Ainda não há endereço público. Rode: node scripts/setup.mjs endereco https://SEU-ENDERECO"); return; }
  console.log(`
════════════ O que colar na Meta (developers.facebook.com) ════════════

Configurações do app → Básico
  Domínios do app ............. ${new URL(base).host}
  URL da Política de Privacidade ${base}/privacidade
  URL de exclusão de dados .... ${base}/privacidade

Casos de uso → API do Instagram → Configuração da API com login do Instagram
  ID e chave secreta do app do Instagram: node scripts/setup.mjs meta --app-id … --app-secret …

  Configurar webhooks
    URL de callback ........... ${base}/api/webhooks/instagram
    Verificar token ........... ${token}
    Ligar os campos ........... comments, messages, messaging_postbacks
    (opcionais) ............... live_comments, message_reactions

  Configurar o login da empresa no Instagram
    URL de redirecionamento OAuth ${base}/api/auth/meta/callback

Depois: publique o app (Modo do app → Ao vivo) e abra
  ${base}/app/ligar-meta  →  Conectar Instagram
═══════════════════════════════════════════════════════════════════════`);
}

async function verificar() {
  const token = pegar("IG_VERIFY_TOKEN");
  console.log("CommentFlow · verificação\n");
  const local = await buscar(`${LOCAL}/api/saude`);
  const s = local.status === 200 ? JSON.parse(local.texto) : null;
  // o endereço pode ter sido salvo pelo assistente do painel, não só no .env
  const base = (s?.meta.enderecoPublico || enderecoPublico()).replace(/\/$/, "");
  const passos = [];
  const checar = (feito, texto, proximo) => { (feito ? ok : falta)(texto); if (!feito) passos.push(proximo); };

  checar(Boolean(s), "painel no ar neste computador", "Ligar o painel: node scripts/setup.mjs");
  checar(Boolean(s?.banco), "banco de dados", "O banco não respondeu: docker compose up -d");
  checar(Boolean(s?.seguranca.senhaPainel), "senha do painel", "Rodar node scripts/setup.mjs para gerar a senha");
  checar(Boolean(s?.seguranca.criptografia), "criptografia dos acessos", "Rodar node scripts/setup.mjs para gerar a chave");
  checar(Boolean(base), `endereço público${base ? `: ${base}` : ""}`, "Criar o túnel ou o deploy e rodar: node scripts/setup.mjs endereco https://…");
  if (base) {
    const pub = await buscar(`${base}/api/saude`, 12000);
    checar(pub.status === 200, "o endereço público chega no painel", "O túnel caiu ou o endereço mudou: suba o túnel de novo e rode `endereco` com o endereço novo");
    const hand = await buscar(`${base}/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=commentflow-teste`, 12000);
    checar(hand.texto === "commentflow-teste", "o webhook responde ao teste da Meta", "O webhook não respondeu: reinicie o painel (o .env pode ter mudado)");
    const priv = await buscar(`${base}/privacidade`, 12000);
    checar(priv.status === 200, "a página de privacidade abre", "A página /privacidade não abriu pelo endereço público");
  }
  checar(Boolean(s?.meta.appId && s?.meta.appSecret), "ID e chave secreta do app da Meta", "Criar o app na Meta e rodar: node scripts/setup.mjs meta --app-id … --app-secret …");
  checar(Boolean(s?.webhook.verificadoEm), `a Meta verificou o webhook${s?.webhook.verificadoEm ? ` (${new Date(s.webhook.verificadoEm).toLocaleString("pt-BR")})` : ""}`, "Na Meta: Webhooks → Instagram → colar URL e token → Verificar e salvar (veja: node scripts/setup.mjs coordenadas)");
  checar(Boolean(s?.instagram.conectado), `Instagram conectado${s?.instagram.conta ? `: @${s.instagram.conta}` : ""}`, `Publicar o app na Meta (Ao vivo) e clicar em Conectar Instagram em ${base || LOCAL}/app/configuracoes`);
  checar((s?.automacoes ?? 0) > 0, "pelo menos uma automação criada", `Criar a primeira automação em ${base || LOCAL}/app/fluxos?modelos=1`);
  checar(Boolean(s?.webhook.ultimoAvisoEm), "a Meta já mandou um aviso (comentário ou direct)", "Comentar a palavra-chave num post com OUTRA conta e ver a resposta chegar");

  console.log(passos.length ? `\nPróximo passo: ${passos[0]}` : "\nTudo pronto. O CommentFlow está respondendo sozinho. 🎉");
}

function senha() {
  if (args[1]) {
    if (args[1].length < 8) { falta("Use uma senha com pelo menos 8 caracteres."); process.exit(1); }
    gravar("PAINEL_SENHA", args[1]);
    ok("senha do painel trocada");
    reiniciar();
  } else {
    console.log(pegar("PAINEL_SENHA") || "(sem senha: rode node scripts/setup.mjs)");
  }
}

const comando = args[0] && !args[0].startsWith("--") ? args[0] : "instalar";
const COMANDOS = { instalar, endereco, meta, coordenadas, verificar, senha };
if (!COMANDOS[comando]) {
  console.log("Comandos: (nenhum) | endereco <https://…> | meta --app-id … --app-secret … | coordenadas | verificar | senha [nova]");
  process.exit(1);
}
await COMANDOS[comando]();
