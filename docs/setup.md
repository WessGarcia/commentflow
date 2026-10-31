# Setup

## Requisitos
- **Docker Desktop** (caminho recomendado), ou **Node.js 22.19+** e
  **PostgreSQL** para rodar sem Docker.
- Conta **Instagram Business/Creator** ligada a uma **Página do Facebook**.
- Um **app na Meta** (Instagram, Webhooks, Facebook Login for Business).

## Instalação
`node scripts/setup.mjs` cria o `.env`, gera `IG_VERIFY_TOKEN`, `ENCRYPTION_KEY`
e `PAINEL_SENHA`, sobe o Compose e espera o painel responder. Os outros
comandos (`endereco`, `meta`, `coordenadas`, `verificar`, `senha`) estão no
[README](../README.md). As chaves da Meta e o endereço público também podem ser
salvos pelo assistente do painel (`/app/ligar-meta`), que vale por cima do `.env`.

## Variáveis de ambiente
O instalador cria o `.env` a partir do `.env.example`. Resumo:

| Variável | Para quê |
| --- | --- |
| `DATABASE_URL` | Conexão Postgres (no Docker é definida automaticamente). |
| `META_APP_ID` / `META_APP_SECRET` | App da Meta (OAuth + assinatura). |
| `META_REDIRECT_URI` | Callback do OAuth (URL pública do túnel). |
| `IG_VERIFY_TOKEN` | Token de verificação do webhook. |
| `ENCRYPTION_KEY` | Criptografa tokens no banco (`openssl rand -base64 32`). |
| `PAINEL_SENHA` | Senha para entrar no painel. Sem ela, o painel só abre em `localhost`. |
| `APP_URL` | Endereço público do painel (links rastreados do construtor). Se vazio, usa a origem do `META_REDIRECT_URI`. |
| `GRAPH_BASE_URL` | Só para testes: aponta as chamadas da Graph API para outro servidor. |
| `IG_ACCESS_TOKEN` / `IG_USER_ID` | Fallback manual (opcional após OAuth). |
| `GRAPH_API_VERSION` | Versão da Graph API (padrão `v26.0`). |

## Subir
```bash
docker compose up --build
```
- Site: http://localhost:3000 · Painel: http://localhost:3000/app
- Webhook: http://localhost:3000/api/webhooks/instagram

## Webhook (Meta)
Assine **`comments`** e **`messages`**. Callback:
`https://SEU-TUNEL/api/webhooks/instagram` · Verify token: `IG_VERIFY_TOKEN`.

## Evidências / pendências
- Versões alvo: Node 24 (Docker), Postgres 16, Next 16, Prisma 6, Zod 4.
- Migração inicial (`0001_init`) + `0002_dmflow` incluídas.
- **Pendente:** execução/validação real (ver [quality.md](quality.md)); encriptar
  também backups do banco; fila/retry; testes automatizados.

Guia completo passo a passo: [GUIA.md](GUIA.md).
