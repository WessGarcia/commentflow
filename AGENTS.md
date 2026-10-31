# AGENTS.md

Instruções compartilhadas para agentes e devs que trabalham neste repositório.

## Visão geral
CommentFlow — automação de comentários do Instagram (resposta pública +
comentário→DM + fluxos multi-passo com quick replies) via API oficial da Meta.
Quem baixa o repositório é o cliente final: ele roda o instalador e usa o painel.
Veja [PRODUCT.md](PRODUCT.md) para o produto e
[docs/architecture.md](docs/architecture.md) para a arquitetura.

## Stack
Next.js 16 (App Router, Turbopack, TypeScript estrito) · React 19 · PostgreSQL +
Prisma 6 · Zod 4 · Tailwind 4 · Docker Compose · npm · Node 22.19+ (Docker: Node 24).

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

# Checagens (rodar antes de dar uma mudança por pronta)
npm run check                # lint + tipos + testes + autochecagem das regras
npm run lint:typed           # promessas soltas/mal usadas (lento, ~90 s)
npm run build                # build de produção (pode rodar com o dev ligado)

# Prisma
npm run prisma:deploy        # aplica migrations (produção/CI)
npm run prisma:studio        # inspecionar o banco
```

## Estrutura
- `src/app/` — landing (`/`), `/flow`, painel (`/app`), rotas de API e webhook.
- `src/proxy.ts` — portão de senha do painel e das rotas internas.
- `src/lib/` — Prisma, env, assinatura do webhook, Graph API, motor do fluxo, crypto.
- `src/**/*.test.ts` — testes (Vitest).
- `eslint-rules/` — regras de qualidade do Vibe Coding Toolkit.
- `prisma/` — schema e migrations.
- `scripts/setup.mjs` — instalador do cliente.
- `docs/` — documentação; `docs/prompts/` — prompts de execução.

## Convenções
- TypeScript estrito; validação de entrada com Zod.
- Rotas que usam Prisma/crypto rodam no runtime Node (`export const runtime = "nodejs"`).
- Comentários no código apenas quando agregam; mensagens de commit descritivas.
- Textos para o cliente em português simples (ele não é programador).

## Acordos de trabalho
- Ler o código e as instruções relevantes antes de editar; separar fato de suposição.
- Menor mudança completa; reaproveitar padrões, componentes e dependências.
- Definir como verificar antes de implementar. Correção de bug vem com teste que
  reproduz; mudança de comportamento atualiza o documento responsável.
- Regra que falha de novo vira teste, regra de lint ou documento — não aviso repetido.
- Não aumentar o rigor escondendo violação: nada de ignore amplo ou teste apagado.
- Publicar, dar push, rodar migration em produção, gastar dinheiro ou mandar
  mensagem a terceiros exige pedido explícito.
- Trabalho que atravessa sessões: registrar estado verificado e próximo passo
  (modelo em [docs/harness.md](docs/harness.md)); ao retomar, conferir arquivos,
  Git e checagens antes de confiar no registro.

## Fronteiras (importante)
- **Somente APIs oficiais.** Não raspar, clonar ou redistribuir produtos de
  terceiros. Não contornar paywall, autenticação ou proteção de ninguém.
- Trabalhar dentro dos Termos da Meta e dos limites de API.

## Segurança
- Segredos nunca versionados (`.env` está no `.gitignore`).
- Tokens de acesso criptografados em repouso (AES-256-GCM) quando há `ENCRYPTION_KEY`
  (o instalador gera; sem ela, ficam em texto puro).
- Assinatura dos webhooks verificada (`X-Hub-Signature-256`).
- Revisão de segurança: [docs/prompts/13-revisao-seguranca.md](docs/prompts/13-revisao-seguranca.md)
  (só leitura, relatório privado fora do repositório).

## Ferramentas de agente
Skills, plugins e o grafo ficam **só no computador de quem desenvolve** (fora do
Git). Quais existem, como usar e como atualizar: [docs/harness.md](docs/harness.md).

## Como validar
Veja [docs/quality.md](docs/quality.md). Em resumo: `npm run check` e
`npm run build`; `docker compose up --build` sobe tudo; depois o teste de ponta a
ponta do [guia](docs/GUIA.md) (conectar conta, criar fluxo, comentar, tocar no botão).
