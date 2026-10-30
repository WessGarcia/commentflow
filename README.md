# CommentFlow

Automação de comentários do **Instagram** via **API oficial da Meta** (Instagram
Graph API). Quando alguém comenta num post, o CommentFlow pode responder
publicamente e/ou enviar uma DM (private reply) — tudo dentro das APIs oficiais.

> Projeto autoral. Não é afiliado, não copia nem redistribui nenhum produto de
> terceiros.

---

> 📘 **Primeira vez / passo a passo pra leigo:** veja [docs/GUIA.md](docs/GUIA.md)
> — cobre instalar o Docker, configurar o app na Meta, ligar e testar os botões.

## 🚀 Rodar (1 comando, com Docker)

Pré-requisito único: **Docker Desktop** instalado. Não precisa de Node nem
Postgres na máquina — o Compose sobe tudo (app + banco) e aplica as migrations
sozinho.

```bash
# 1. clonar
git clone <URL-DO-SEU-REPO> commentflow
cd commentflow

# 2. criar o .env (preencher as credenciais da Meta)
cp .env.example .env     # no Windows: copy .env.example .env

# 3. subir a plataforma
docker compose up --build
```

Pronto:
- **Site (landing):** http://localhost:3000
- **Painel interno:** http://localhost:3000/app
- **Webhook:** http://localhost:3000/api/webhooks/instagram

Para expor o webhook pra Meta (que precisa de HTTPS público), use um túnel:

```bash
cloudflared tunnel --url http://localhost:3000
# ou: ngrok http 3000
```

## ☁️ Deploy em 1 clique (sem Docker, 24/7)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/gabrieltabarkiewicz/commentflow)

Sobe o app + Postgres gerenciado pela Render (lê o `render.yaml`, aplica
migrations e serve com URL pública fixa). Passo a passo e custos em
[docs/DEPLOY.md](docs/DEPLOY.md).

## 🧩 O que preencher no `.env`

| Variável            | O que é                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| `META_APP_ID`       | App ID do app na Meta (usado no OAuth do painel).                           |
| `META_APP_SECRET`   | App secret (valida `X-Hub-Signature-256` e troca o code do OAuth).          |
| `META_REDIRECT_URI` | Opcional. URL de callback do OAuth; vazio = `<origin>/api/auth/meta/callback`. |
| `IG_VERIFY_TOKEN`   | String aleatória que você escolhe; a mesma vai no webhook da Meta.          |
| `IG_ACCESS_TOKEN`   | **Opcional** (fallback). Depois do OAuth não é necessário.                  |
| `IG_USER_ID`        | **Opcional** (fallback). Depois do OAuth não é necessário.                  |
| `ENCRYPTION_KEY`    | Criptografa os tokens no banco (AES-256-GCM). Gere com `openssl rand -base64 32`. |
| `GRAPH_API_VERSION` | Versão da Graph API (padrão `v26.0`).                                       |
| `DATABASE_URL`      | No Docker é definido automaticamente; só importa pra rodar sem Docker.      |

## ⚙️ Pré-requisitos na Meta (API oficial)

1. Conta **Instagram Business/Creator** ligada a uma **Página do Facebook**.
2. App no **[Meta for Developers](https://developers.facebook.com/)** com o
   produto *Instagram* + webhooks.
3. Produtos no app: **Instagram**, **Webhooks** e **Facebook Login for Business**.
4. Permissões: `instagram_basic`, `instagram_manage_comments`,
   `instagram_manage_messages`, `pages_show_list`, `pages_manage_metadata`,
   `business_management`.
   - Em **modo de desenvolvedor** dá pra testar na própria conta sem App Review.
5. Em **Facebook Login > Configurações**, adicione a **Valid OAuth Redirect URI**:
   `https://SEU-TUNEL/api/auth/meta/callback` (ou `http://localhost:3000/...`
   quando aplicável). Se usar túnel, defina `META_REDIRECT_URI` com essa URL.
6. No painel do app, configure o webhook do Instagram:
   - **Callback URL:** `https://SEU-TUNEL/api/webhooks/instagram`
   - **Verify token:** o mesmo valor de `IG_VERIFY_TOKEN`
   - Assine os campos **`comments`** e **`messages`** (o `messages` é
     necessário para os botões/quick replies do fluxo multi-passo).

## 🔑 Conectar sua conta (OAuth)

No painel, clique em **“Conectar Instagram”**. Você é levado ao login do
Facebook, autoriza as permissões e volta pro painel — o CommentFlow descobre a
conta IG Business ligada à sua Página e guarda o token dela. **Sem colar token
na mão.** Dá pra conectar mais de uma conta e desconectar quando quiser.

> As chamadas de comentário/DM usam o token da conta conectada mais recente.
> `IG_ACCESS_TOKEN`/`IG_USER_ID` ficam só como fallback manual.

## 🧪 Criar um fluxo

No painel (`http://localhost:3000/app`) use **“+ Novo fluxo”** para criar,
editar, ativar/desativar e excluir fluxos — sem linha de comando.

A DM pode ser **simples** (uma mensagem) ou um **fluxo com botões**: adicione
passos, cada um com seu texto e botões (quick replies); cada botão aponta para o
próximo passo ou encerra. O 1º passo é a DM inicial; quando a pessoa toca num
botão, o CommentFlow envia o passo seguinte.

Se preferir, a API continua disponível:

```bash
curl -X POST http://localhost:3000/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sorteio",
    "scope": "ALL_POSTS",
    "matchType": "KEYWORD",
    "keywords": ["eu quero", "quero"],
    "publicReplies": ["Te mandei no direct! 💜", "Olha seu DM 👀"],
    "dmMessage": "Oi! Aqui está o link que você pediu: https://seu-link.com"
  }'
```

Comente uma das palavras-chave num post seu → o CommentFlow responde o
comentário e manda a DM.

---

## 🖥️ Rodar sem Docker (opcional)

Precisa de **Node.js 22.19+** e **PostgreSQL** locais.

```bash
npm install
cp .env.example .env     # ajuste o DATABASE_URL para o seu Postgres
npm run prisma:migrate   # cria as tabelas
npm run dev
```

## 🏗️ Stack

- **Next.js** (App Router, TypeScript) — painel + rotas de API/webhook
- **PostgreSQL + Prisma** — persistência (migration inicial já incluída)
- **Zod** — validação de entrada
- **Docker Compose** — app + banco prontos pra subir

## 📂 Estrutura

```
src/
  app/
    page.tsx                        # landing page (/)
    layout.tsx                      # layout raiz
    globals.css
    app/
      layout.tsx                    # shell do painel (sidebar + topo)
      page.tsx                      # painel interno (/app)
    api/
      webhooks/instagram/route.ts   # verificação (GET) + ingestão (POST)
      flows/route.ts                # listar/criar fluxos
      flows/[id]/route.ts           # editar/excluir fluxo
      accounts/[id]/route.ts        # desconectar conta
      auth/meta/login/route.ts      # inicia o OAuth
      auth/meta/callback/route.ts   # recebe o code e salva o token
  components/
    FlowsManager.tsx   # editor de fluxos (client)
    ConnectionPanel.tsx# conexão de contas (client)
  lib/
    db.ts              # Prisma client
    env.ts             # variáveis de ambiente
    credentials.ts     # token da conta conectada (fallback .env)
    signature.ts       # verificação X-Hub-Signature-256
    meta.ts            # chamadas à Graph API (reply + DM)
    processComment.ts  # match + ações + dedup
prisma/
  schema.prisma
  migrations/          # migration inicial (migrate deploy)
Dockerfile
docker-compose.yml
```

## 📚 Documentação

- [PRODUCT.md](PRODUCT.md) — problema, público, MVP, fluxos, critérios
- [AGENTS.md](AGENTS.md) — instruções para agentes/devs (comandos, convenções)
- [docs/architecture.md](docs/architecture.md) — componentes e fluxo de dados
- [docs/design.md](docs/design.md) — identidade e UI
- [docs/onboarding.md](docs/onboarding.md) — começar a desenvolver
- [docs/setup.md](docs/setup.md) — ambiente e variáveis
- [docs/quality.md](docs/quality.md) — como verificar e o que falta
- [docs/GUIA.md](docs/GUIA.md) — passo a passo pra ligar e testar (leigo)
- [docs/prompts/](docs/prompts/) — prompts de execução para agentes

### Atalho (rodar via agente)
Cole num agente com acesso ao diretório de destino:

```text
Leia https://raw.githubusercontent.com/gabrieltabarkiewicz/commentflow/main/docs/prompts/00-setup.md e execute o setup neste diretório.
```

(Com o repositório privado, o link `raw` exige autenticação — clone o repo e
aponte para `docs/prompts/00-setup.md`, ou torne o repositório público.)

## 🗺️ Roadmap

- [x] Landing page (`/`) e painel interno (`/app`) com layout próprio
- [x] Editor de fluxos no painel (criar/editar/ativar/excluir)
- [x] OAuth da Meta no painel (conectar conta sem colar token)
- [x] Quick replies encadeados (fluxo multi-passo no editor)
- [x] Criptografar tokens de acesso no banco (AES-256-GCM)
- [ ] Editor de fluxo em canvas visual (arrastar nós)
- [ ] Fila (BullMQ/Redis) com rate-limit e retry
- [ ] Multiconta e multiusuário
- [ ] Broadcast e segmentação por tags

## ⚖️ Uso responsável

Use dentro dos Termos da Meta e das plataformas. Respeite limites de API,
consentimento dos usuários e políticas de spam.
