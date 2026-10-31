# AGENTS.md

Instruções compartilhadas para agentes e devs que trabalham neste repositório.

## Visão geral
CommentFlow — automação de comentários do Instagram (resposta pública +
comentário→DM + fluxos multi-passo com quick replies) via API oficial da Meta.
Veja [PRODUCT.md](PRODUCT.md) para o produto e
[docs/architecture.md](docs/architecture.md) para a arquitetura.

## Stack
Next.js (App Router, TypeScript) · PostgreSQL + Prisma · Zod · Docker Compose.

## Comandos
```bash
# Instalador (recomendado): .env, segredos, Docker, migrations e checagem
node scripts/setup.mjs              # instala e liga
node scripts/setup.mjs verificar    # diz o próximo passo da instalação
node scripts/setup.mjs coordenadas  # valores para colar na Meta

# Docker direto: sobe app + banco e aplica migrations
docker compose up --build

# Local (precisa de Node 22.19+ e Postgres)
npm install
cp .env.example .env         # preencher
npm run prisma:migrate       # cria as tabelas (dev)
npm run dev                  # http://localhost:3000

# Prisma
npm run prisma:deploy        # aplica migrations (produção/CI)
npm run prisma:studio        # inspecionar o banco
```

## Estrutura
- `src/app/` — landing (`/`) e painel (`/app`), rotas de API e webhook.
- `src/components/` — UI client (editor de fluxos, conexão).
- `src/lib/` — Prisma, env, assinatura do webhook, Graph API, fluxo, crypto.
- `prisma/` — schema e migrations (migração inicial incluída).
- `docs/` — documentação; `docs/prompts/` — prompts de execução.

## Convenções
- TypeScript estrito; validação de entrada com Zod.
- Rotas que usam Prisma/crypto rodam no runtime Node (`export const runtime = "nodejs"`).
- Comentários no código apenas quando agregam; mensagens de commit descritivas.

## Fronteiras (importante)
- **Somente APIs oficiais.** Não raspar, clonar ou redistribuir produtos de
  terceiros. Não contornar paywall, autenticação ou proteção de ninguém.
- Trabalhar dentro dos Termos da Meta e dos limites de API.

## Segurança
- Segredos nunca versionados (`.env` está no `.gitignore`).
- Tokens de acesso criptografados em repouso (AES-256-GCM, `ENCRYPTION_KEY`).
- Assinatura dos webhooks verificada (`X-Hub-Signature-256`).

## Como validar
Veja [docs/quality.md](docs/quality.md). Em resumo: `docker compose up --build`
sobe tudo; depois rode o teste de ponta a ponta do
[guia](docs/GUIA.md) (conectar conta, criar fluxo, comentar, tocar no botão).
