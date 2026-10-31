# Arquitetura

## Visão geral
CommentFlow é uma app Next.js única que serve a landing, o painel, as rotas de
API e o webhook; persiste em Postgres via Prisma. Toda a análise/ação acontece
no servidor (runtime Node).

```
Instagram (Meta) ──webhook──▶ /api/webhooks/instagram ──▶ processComment / processMessaging
        ▲                                                         │
        └──────────── Graph API (reply + DM) ◀────────────────────┘
Painel (/app) ──OAuth──▶ /api/auth/meta/* ──▶ Account (token criptografado)
```

## Componentes
- **Portão do painel** (`src/proxy.ts`, convenção `proxy` do Next 16, sempre em
  Node): tranca `/app` e `/api` atrás da `PAINEL_SENHA` (cookie assinado,
  `src/lib/sessao.ts`). Webhook, entrar/sair e `/api/saude` ficam livres. Sem
  senha, só abre em `localhost`.
- **Webhook** (`src/app/api/webhooks/instagram/route.ts`): `GET` faz o
  handshake de verificação; `POST` valida a assinatura `X-Hub-Signature-256` e
  despacha eventos de `comments` e de `messaging`.
- **processComment** (`src/lib/processComment.ts`): dedup por `commentId`,
  casa o comentário com um fluxo ativo e executa as ações (resposta pública +
  DM simples ou passo de entrada do fluxo).
- **processMessaging** (`src/lib/processMessaging.ts`): trata cliques em botões
  (quick_reply/postback); o payload carrega `flowId` + `stepId`, então envia o
  passo alvo sem precisar de sessão no servidor.
- **Graph API** (`src/lib/meta.ts`): `replyToComment` e `sendDm` (recipient por
  `comment_id` ou `id`), com suporte a `quick_replies`.
- **OAuth** (`src/app/api/auth/meta/*`): login do Facebook, troca de code por
  token (short→long-lived), descoberta da conta IG Business e persistência do
  token da Página (criptografado).
- **Credenciais** (`src/lib/credentials.ts`): usa o token da conta conectada
  mais recente (descriptografado), com fallback para o `.env`.
- **Painel** (`src/app/app/*`): server components para dados + client
  components para interação (editor de fluxos, conexão).

## Modelo de dados (Prisma)
- `Account` — conta IG conectada (igUserId, username, accessToken criptografado).
- `Flow` — automação: escopo, condição, palavras-chave, respostas públicas,
  `dmMessage` (simples) ou `dmFlow` (JSON multi-passo).
- `CommentEvent` — todo comentário recebido (dedup + auditoria).
- `ActivityLog` — ações executadas (respostas, DMs, erros).

## Fluxo multi-passo (dmFlow)
JSON: `{ entry, steps: { id: { text, quickReplies: [{ title, next }] } } }`.
Cada botão vira um quick reply cujo payload é `qr::<flowId>::<stepId>`. Ao ser
tocado, `processMessaging` resolve e envia o passo `next`.

## Decisões
- Estado do fluxo no payload (sem sessão server-side) → simples e resiliente.
- JSON para o fluxo (em vez de tabelas de nós) → menos migrations, edição fácil.
- Processamento síncrono no `POST` do webhook no v0; fila (BullMQ/Redis) quando
  o volume exigir.
