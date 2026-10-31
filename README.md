# CommentFlow

Automação de comentários e direct do **Instagram** pela **API oficial da Meta**.
Quem comenta a palavra-chave recebe a resposta no post e a mensagem no direct,
com botões, esperas, condições e links rastreados. O painel tem caixa de
entrada, contatos em quadro, insights e moderação de comentários. Sem
mensalidade e sem cobrança por contato.

> Projeto autoral. Não é afiliado, não copia nem redistribui produto de terceiros.

---

## 🤖 Instalar com 1 prompt (recomendado)

Abra o **Claude Code** (ou outro agente de código) numa pasta vazia e cole:

```text
Leia https://raw.githubusercontent.com/gabrieltabarkiewicz/commentflow/main/docs/prompts/00-setup.md e execute tudo, do começo ao fim.
```

O agente baixa o projeto, instala, liga o painel, cria o endereço público e te
conduz pela Meta. Você só clica no site da Meta e no login do Facebook, e cola o
ID e a chave do seu app.

## 🚀 Instalar com 1 comando

Pré-requisito: **Docker Desktop** ligado (ou Node 22.19+ e Postgres, com `--local`).

```bash
git clone https://github.com/gabrieltabarkiewicz/commentflow.git
cd commentflow
node scripts/setup.mjs
```

O instalador cria o `.env`, gera os segredos e a **senha do painel**, sobe o
app e o banco, aplica as migrações e confere se está no ar. No fim mostra:

- **Painel:** http://localhost:3000/app (com a senha gerada)
- **Site:** http://localhost:3000

Depois, abra **Configurações → Assistente: ligar a Meta** no painel. Ele mostra
cada etapa da Meta com os seus endereços prontos para copiar, recebe o ID e a
chave do app e diz o que falta.

### Comandos do instalador

| Comando | O que faz |
|---|---|
| `node scripts/setup.mjs` | Instala e liga (Docker; `--local` sem Docker) |
| `node scripts/setup.mjs endereco https://…` | Grava o endereço público (túnel ou Render) e reinicia |
| `node scripts/setup.mjs meta --app-id … --app-secret …` | Grava as chaves do app da Meta e reinicia |
| `node scripts/setup.mjs coordenadas` | Mostra os valores para colar na Meta |
| `node scripts/setup.mjs verificar` | Confere tudo e diz o próximo passo |
| `node scripts/setup.mjs senha [nova]` | Mostra ou troca a senha do painel |

Desligar: `docker compose down` · Ligar de novo: `docker compose up -d`

## ☁️ No ar 24 h (Render)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/gabrieltabarkiewicz/commentflow)

Sobe o app e um Postgres gerenciado, com endereço público fixo. Passo a passo e
custos em [docs/DEPLOY.md](docs/DEPLOY.md).

## 🧩 Variáveis do `.env`

O instalador preenche as de segurança. As da Meta podem ir aqui **ou** pelo
assistente do painel (que vale por cima do `.env`).

| Variável            | O que é |
| ------------------- | ------- |
| `PAINEL_SENHA`      | Senha do painel. Sem ela, o painel só abre em `localhost`. |
| `ENCRYPTION_KEY`    | Criptografa os acessos no banco (AES-256-GCM). Não perca. |
| `IG_VERIFY_TOKEN`   | Token que a Meta usa para verificar o webhook. |
| `APP_URL`           | Endereço público do painel (links rastreados, assistente). |
| `META_APP_ID`       | ID do app na Meta. |
| `META_APP_SECRET`   | Chave secreta do app (assina os avisos e troca o login). |
| `META_REDIRECT_URI` | Volta do login; vazio = `APP_URL/api/auth/meta/callback`. |
| `GRAPH_API_VERSION` | Versão da Graph API (padrão `v26.0`). |
| `DATABASE_URL`      | No Docker é automático; só importa com `--local`. |
| `GRAPH_BASE_URL`    | Só para testes (aponta a Graph API para um servidor falso). |

## ✨ O que tem no painel

- **Início:** números do período, primeiros passos, comentários recentes.
- **Conversas:** caixa de entrada do direct, resposta dentro da janela de 24 h.
- **Automações:** modelos prontos, editor de 3 passos e **construtor visual**
  (mensagem com botões, espera, condição, sorteio A/B, etiqueta, coleta de dado).
- **Gatilhos:** comentário no post, comentário na live, resposta e menção no
  story, reação no direct.
- **Comentários:** moderação (responder, direct, ocultar, aplicar automação).
- **Contatos:** lista com ficha, quadro arrastável, exportação CSV.
- **Insights:** gráfico, top automações e palavras, economia.
- **Notificações, Central de ajuda e assistente "Ligar a Meta".**

## 🏗️ Stack e estrutura

Next.js (App Router, TypeScript) · PostgreSQL + Prisma · Zod · Tailwind ·
React Flow · Docker Compose.

```
scripts/setup.mjs          instalador e verificação
src/app/app/               o painel (uma pasta por tela)
src/app/api/               rotas: webhook, OAuth, automações, conversas…
src/lib/                   motor (motor.ts), webhook (processComment.ts),
                           Graph API (meta.ts), dados do painel
prisma/                    schema e migrações (aplicadas sozinhas no deploy)
docs/                      guia, deploy, arquitetura, prompts
```

## 📚 Documentação

- [docs/GUIA.md](docs/GUIA.md): passo a passo para leigo (Meta, túnel, teste)
- [docs/DEPLOY.md](docs/DEPLOY.md): no ar 24 h na Render
- [docs/prompts/00-setup.md](docs/prompts/00-setup.md): o prompt de instalação
- [AGENTS.md](AGENTS.md): instruções para agentes e devs
- [docs/architecture.md](docs/architecture.md) · [docs/setup.md](docs/setup.md) · [docs/quality.md](docs/quality.md)

## ⚖️ Uso responsável

Use dentro dos Termos da Meta. Mande só o que a pessoa pediu: spam leva a
bloqueio da conta pela própria Meta.
