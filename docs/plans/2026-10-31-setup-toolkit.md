# Setup do Vibe Coding Toolkit no CommentFlow — design e plano

Status: **aprovado em 2026-10-31 (com CI)** · Toolkit: revisão `21b71b6` (2026-10-29) · Prompt 12

## Objetivo
Deixar o CommentFlow pronto para desenvolvimento com agentes: instruções curtas e
confiáveis, comandos reproduzíveis (lint, tipos, testes, build), dependências sem
as falhas graves da auditoria e evidência de antes/depois. O produto, os dados,
o instalador (`scripts/setup.mjs`) e a experiência do cliente não mudam.

## Decisões já tomadas
1. **Ferramentas de agente só no computador** (skills, plugins, grafo): ficam no
   `.gitignore`; quem baixa o repositório não recebe. Lint, testes e documentação
   vão para o repositório.
2. **Next 16 e Zod 4 entram agora**, depois que os testes existirem.

## Diagnóstico (linha de base, 2026-10-31)
| Item | Estado |
|---|---|
| Stack | Next 15.5.28, React 19.3, TypeScript 5.9 estrito, Prisma 6.19.3, Zod 3, Tailwind 4, Node 24 (Docker `node:24`) |
| Tipos (`tsc --noEmit`) | passa |
| Lint | não existe |
| Testes | não existem |
| CI | não existe |
| Build | não rodado nesta linha de base (o dev server ocupa `.next`); passou no teste com Docker de 2026-10-30 |
| Auditoria (`npm audit --omit=dev`) | 6 falhas: 5 altas (prisma, @prisma/config, deepmerge-ts, postcss via next, zod) e 1 moderada (next) |
| Arquivos > 350 linhas | `construtor.tsx` 590, `conversas.tsx` 408, `simples.tsx` 384, `ui.tsx` 356 |
| Docs do manifesto | os 9 existem; `docs/setup.md` é o guia de instalação do cliente |

## Impacto levantado das atualizações
- **Next 16** (guia oficial de upgrade): `middleware.ts` vira `proxy.ts` com
  função `proxy` (o nosso já roda em Node, compatível); Turbopack passa a ser o
  padrão no build (não temos config de webpack); `next lint` some (não usamos);
  `params`/`searchParams` já são assíncronos aqui. Codemod oficial:
  `npx @next/codemod@canary upgrade latest`.
- **Zod 4** (changelog oficial): `z.record` exige dois argumentos (1 uso em
  `validation.ts`), `.url()` vira `z.url()` (1 uso), `.default()` muda de
  semântica em objetos (11 usos a conferir), `.errors` saiu (não usamos).
- **Prisma**: correção dentro da versão 6, sem troca grande.

## Entregas (em ordem de dependência e risco)
Cada entrega termina com as checagens disponíveis passando e um commit
reversível. Nada é publicado nem enviado (push) sem você pedir.

**E0 — Cópia de segurança e linha de base.** Copiar `.claude/` (não versionada)
para fora do projeto; rodar o build com o dev server parado; guardar os números.

**E1 — Contexto.** `AGENTS.md` curto, com comandos canônicos, acordos de trabalho
e mapa para os documentos (mantendo as Fronteiras e a Segurança atuais).
`CLAUDE.md` continua importando `AGENTS.md`. Registro do toolkit em
**`docs/harness.md`** (novo), porque `docs/setup.md` continua sendo o guia do
cliente. Índice de memória curto do Claude para este projeto.

**E2 — Ferramentas (só locais).** Escopo local (fora do Git):
Superpowers, Ponytail, Caveman e Context7 (plugins no escopo `local`); skills da
Vercel + `find-skills`; `supabase-postgres-best-practices`; `differential-review`;
`next-bundle-optimizer`; `next-dev-loop` (passa a ser compatível com Next 16.3+,
mas precisa do `agent-browser`, que exige instalação global: pedirei à parte).
Graphify com `.graphifyignore` e grafo do código. RTK já está ligado e é reaproveitado.

**E3 — Qualidade.** ESLint (flat config) com `eslint-config-next` e o perfil
leve de regras do toolkit, mais as regras de promessas
(`no-floating-promises`, `no-misused-promises`). Primeiro medir as violações por
regra: regra nova com violações antigas entra como aviso, com contagem. Vitest com
testes das partes críticas: sessão do painel (HMAC), assinatura do webhook,
criptografia, validação dos fluxos, grafo do construtor e colunas do quadro.
Scripts `lint`, `typecheck`, `test` e `check` (todos juntos) no `package.json`.

**E4 — Atualizações**, uma por commit, cada uma com checagens, build local, build
Docker e teste no navegador (painel, login, automação, webhook):
Prisma (patch) → Zod 4 → Next 16 (codemod + `proxy.ts`).
*Volta atrás:* `git revert` do commit + `npm ci`.

**E5 — Organização.** Regra de 350 linhas como aviso (4 arquivos hoje). A
refatoração desses arquivos fica como proposta separada; não entra escondida aqui.

**E6 — CI (proposta).** Workflow do GitHub Actions rodando `npm run check` e o
build em cada push. Não exige conta nem proteção de branch. Só roda no GitHub
depois que você fizer push.

**E7 — Verificação do harness.** Casos descartáveis do prompt 14 (correção de
fronteira, handoff desatualizado, revisão de segurança só leitura) e o método
nativo do Harness2 (prompt 15); laboratório oficial do Harness2 não selecionado
(falta `uv`, custos de API). Prompt de revisão de segurança (13) copiado para
`docs/prompts/`. Revisão independente do diff, só leitura.

**E8 — Entrega.** `docs/harness.md` com a matriz final, versões, decisões e
pendências; `docs/quality.md` com os comandos; README atualizado.

## Matriz de cobertura
| Componente | Ação | Escopo | Critério de validação |
|---|---|---|---|
| Superpowers | instalar | local | skill aparece numa sessão nova |
| Ponytail | instalar | local | idem |
| Caveman | instalar | local | idem; `stop caveman` desliga |
| RTK | reaproveitar | global | gancho `rtk hook claude` ativo, sem duplicar |
| Context7 | instalar | local | consulta real funciona |
| Graphify | integrar | local | grafo gerado, sem `.env`, `node_modules` ou skills |
| Skills Vercel (8) + find-skills | instalar | local | descobertas pelo Claude |
| next-dev-loop | instalar após Next 16 | local | bloqueado até `agent-browser` ser autorizado |
| next-bundle-optimizer | instalar | local | descoberta; roda só sob pedido |
| supabase-postgres-best-practices | instalar | local | descoberta |
| gh-fix-ci | não se aplica agora | — | volta a valer se E6 entrar e houver Codex |
| differential-review | instalar | local | descoberta |
| shadcn | não se aplica | — | projeto usa componentes próprios |
| Sentry MCP | não se aplica | — | sem Sentry |
| Harness2 | método nativo | projeto | casos de fumaça registrados |
| agent-browser / DevTools MCP | reaproveitar equivalente | — | navegadores do app (painel e Chrome) |
| Memória em camadas | integrar | local | índice curto, recuperado numa sessão nova |
| Anthropic skills / skill-creator | reaproveitar | global | já disponíveis |
| Plugins oficiais / aia-harness | não instalar | — | sem necessidade concreta |
| Hooks do cliente | nenhum novo | — | só o do RTK |
| ESLint + regras do toolkit | instalar | repo | `npm run lint` com contagem registrada |
| Testes (Vitest) | instalar | repo | `npm test` passa |
| CI | proposta (E6) | repo | workflow válido |
| Revisão de segurança (prompt 13) | integrar | repo | prompt em `docs/prompts/` |
| Atualizações Prisma/Zod/Next | atualizar | repo | auditoria sem falhas altas; app funcionando |

## Fora do escopo
Refatorar os arquivos grandes, trocar Prisma por Drizzle, adotar shadcn, Sentry,
deploy, migrations em produção e qualquer coisa que mude o que o cliente vê.
