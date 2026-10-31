# Harness de desenvolvimento com agentes

Como este repositório é preparado para trabalhar com agentes de código (Claude
Code, Codex): instruções, ferramentas, checagens, revisão e retomada. É para quem
desenvolve o CommentFlow; o cliente final não precisa de nada daqui.

- Fonte: [Vibe Coding Toolkit](https://github.com/soumatheusgomes/vibe-coding-toolkit),
  revisão `21b71b68` (2026-10-29), prompt 12 (projeto existente).
- Aplicado em 2026-10-31. Plano e decisões: [plans/2026-10-31-setup-toolkit.md](plans/2026-10-31-setup-toolkit.md).
- Instruções compartilhadas: [AGENTS.md](../AGENTS.md) (o `CLAUDE.md` só importa ele).

## Decisões
1. **Ferramentas de agente ficam só no computador de quem desenvolve.** O
   repositório é público e cada cliente baixa ele inteiro. `.claude/`, `.agents/`,
   `skills-lock.json`, `.graphifyignore` e `graphify-out/` estão no `.gitignore`
   e no `.dockerignore`. Lint, testes, CI e documentação vão para o repositório.
2. **Next 16 e Zod 4 entraram neste setup**, depois que os testes existiam.
3. **`docs/setup.md` continua sendo o guia de instalação do cliente.** O registro
   do toolkit fica aqui, em vez de competir com ele.

## Ferramentas locais (reinstalar num computador novo)
Rodar na raiz do projeto. Tudo fica fora do Git.

```bash
# Plugins do Claude Code, escopo local (.claude/settings.local.json)
claude plugin install superpowers@claude-plugins-official --scope local
claude plugin install ponytail@ponytail --scope local
claude plugin install context7@claude-plugins-official --scope local

# Skills do projeto (copiadas para .claude/skills; versões em skills-lock.json)
npx --yes skills@latest add vercel-labs/agent-skills --skill vercel-react-best-practices vercel-composition-patterns web-design-guidelines writing-guidelines vercel-react-view-transitions vercel-optimize deploy-to-vercel vercel-cli-with-tokens --agent claude-code --yes
npx --yes skills@latest add vercel-labs/skills --skill find-skills --agent claude-code --yes
npx --yes skills@latest add supabase/agent-skills --skill supabase-postgres-best-practices --agent claude-code --yes
npx --yes skills@latest add https://github.com/trailofbits/skills/tree/main/plugins/differential-review --skill differential-review --agent claude-code --yes
# No Windows, as duas do Next precisam de caminhos longos só para o git do instalador:
#   GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.longpaths GIT_CONFIG_VALUE_0=true
npx --yes skills@latest add https://github.com/vercel/next.js/tree/canary/skills/next-bundle-optimizer --skill next-bundle-optimizer --agent claude-code --yes
npx --yes skills@latest add https://github.com/vercel/next.js/tree/canary/skills/next-dev-loop --skill next-dev-loop --agent claude-code --yes

# Grafo do código (Graphify já instalado na máquina), sem chamar modelo
GRAPHIFY_NO_AUTO_REFRESH=1 graphify extract . --code-only --no-cluster
```

`.graphifyignore` (local) exclui `.env*`, chaves, dependências, `.next`, skills,
`marketing/`, `public/` e lockfiles. Atualizar: `npx skills@latest update` para as
skills; repetir o `graphify extract` depois de mudanças grandes no código.
Instalar uma skill não autoriza o que ela faz (deploy, por exemplo, só sob pedido).

## Matriz de cobertura (2026-10-31)
Estados: **validado** (rodou e foi conferido), **descoberto** (o cliente listou a
skill; ainda sem uso real), **configurado** (instalado, sem uso real ainda), **reaproveitado**, **não se aplica**, **bloqueado**.

| Componente | Estado | Evidência / motivo |
|---|---|---|
| Superpowers 7.x | descoberto (local) | skills `superpowers:*` apareceram na própria sessão do setup depois da instalação |
| Ponytail 5.3.3 | descoberto (local) | skills `ponytail:*` apareceram na sessão; opções de webhook vazias (enviariam dados para fora) |
| Caveman | bloqueado | precisa adicionar o marketplace `JuliusBrussee/caveman` no perfil do usuário (fora do projeto); aguarda autorização |
| RTK 0.45.0 | reaproveitado | gancho global `rtk hook claude` ativo; nenhum gancho duplicado |
| Context7 | bloqueado (autorização) | plugin instalado, mas o servidor MCP pede login: rodar `/mcp` num terminal do Claude Code. Até lá, usar a doc oficial (foi o que o setup fez para Next e Zod) |
| Graphify 0.9.38 | validado | 736 nós, 1793 ligações (refeito depois do `proxy.ts`); 0 arquivos proibidos; `explain`/`query` responderam. SQL das migrations fica de fora (falta `graphifyy[sql]`) |
| Skills Vercel (8) + find-skills | descoberto (local) | nomes conferidos no frontmatter; listadas na sessão do setup |
| supabase-postgres-best-practices | descoberto (local) | vale para Postgres com Prisma |
| differential-review | descoberto (local) | usado pelo prompt de revisão em modo diff |
| next-bundle-optimizer | descoberto (local) | roda só quando pedirem auditoria de bundle |
| next-dev-loop | bloqueado | descoberto; Next 16.4.3 + Turbopack já são compatíveis; falta o `agent-browser` 0.31.1+, que é instalação global |
| gh-fix-ci | não se aplica | é fluxo do Codex; o CI daqui é GitHub Actions simples |
| shadcn | não se aplica | o painel usa componentes próprios (Tailwind) |
| Sentry MCP | não se aplica | o projeto não usa Sentry |
| agent-browser / Chrome DevTools MCP | reaproveitado | navegador do app do Claude e Claude in Chrome cobrem console, rede e telas |
| Memória em camadas | validado | índice `MEMORY.md` na memória do Claude Code deste projeto (fora do repo), 2 fatos com fonte e gatilho de revisão |
| Anthropic skills / skill-creator | reaproveitado | já disponíveis no Claude Code |
| Plugins oficiais extras / aia-harness | não instalado | sem necessidade concreta |
| Ganchos do cliente | só o do RTK | nenhum gancho novo; nenhum gancho de Git |
| ESLint + regras do toolkit | validado | `npm run lint` 0 erros / 23 avisos; autochecagem das regras ok |
| Vitest | validado | 47 testes em 7 arquivos |
| CI (GitHub Actions) | configurado | `.github/workflows/check.yml` (Node 22 e 24); os mesmos passos passaram num clone limpo sem `.env`; no GitHub só depois do push |
| Revisão de segurança (prompt 13) | configurado | [prompts/13-revisao-seguranca.md](prompts/13-revisao-seguranca.md) |
| Harness2 | validado (método nativo) | ver abaixo; laboratório oficial não selecionado (falta `uv`, custo de API) |

## Dependências
Auditoria de produção depois do setup: de 6 falhas (5 altas) para 3 altas, todas
da mesma raiz: `deepmerge-ts < 8` preso pelo `@prisma/config` 6.19.3, a última do
Prisma 6. O caminho é da CLI do Prisma (lê configuração), sem entrada de usuário.
Só some com o **Prisma 7**, que muda o cliente e a configuração: proposta à parte.
As 15 moderadas restantes são do ESLint (desenvolvimento). `npm install` mostra
avisos de "peer eslint" de plugins que ainda não declaram o ESLint 10; o
`eslint-config-next` 16.4 suporta o ESLint 10 oficialmente.

## Delegação a subagentes
- Delegar só quando isolar contexto, especializar ou paralelizar compensa;
  tarefas pequenas o agente principal faz.
- Modelo mais leve que cumpra o critério: buscas, inventários e casos simples →
  modelo leve; revisão de segurança, autenticação e dados → modelo forte.
  O modelo principal da sessão não muda.
- Cada tarefa leva objetivo, arquivos permitidos, critério de aceite e checagem.
  Um escritor por arquivo; lockfile, configuração e Git ficam com o coordenador.
  Revisores só leem. O coordenador confere o diff e roda as checagens de novo.

## Retomar trabalho entre sessões
Para trabalho inacabado, registrar no plano ou tarefa existente:

```text
- Objetivo e aceite:
- Estado conferido: (data, commit, mudanças locais)
- Feito:
- Evidência: (comandos e resultados reais; o que não rodou)
- Falta: (próximo passo menor, riscos)
- Bloqueios: (causa e condição para seguir)
- Recursos: (processos, portas, bancos descartáveis a limpar)
```

Ao retomar, conferir arquivos, Git, checagens e processos antes de confiar no registro.

## Avaliar e melhorar o harness
Método nativo inspirado no Harness2 (não roda o framework do Google nem
reproduz os resultados dele). Prompts de origem: toolkit `docs/prompts/14-harness-evaluation.md`
e `docs/prompts/15-harness-improvement.md`, revisão `21b71b68`.

**Quando:** depois de mudar instruções, ferramentas, modelo ou cliente; ou quando
um agente erra a mesma coisa duas vezes.
**Como:** cópias descartáveis do fixture `templates/harness-evaluation/` do toolkit,
fora do projeto; o avaliador `scripts/validate-harness.mjs` fica fora do alcance do
agente testado; um agente novo por caso; o coordenador roda o avaliador de novo e
confere o diff. Uma comparação de candidato por falha observada, depois relatório.

Resultado em 2026-10-31 (Claude Code 2.1.304; coordenador Opus 5.5; subagentes
novos, não um cliente reiniciado):

| Caso | Modelo | Resultado | Conferido pelo coordenador |
|---|---|---|---|
| Correção de fronteira | Haiku | passou | linha de base 5/7 → 7/7; notas e instruções preservadas |
| Handoff desatualizado | Haiku | passou | recusou o "7/7" falso, corrigiu, registrou a evidência real; 7/7 |
| Revisão só leitura | Sonnet | passou | hashes iguais antes/depois; relatório privado com os 2 achados (outro tenant, identidade vazia) |
| Descoberta no projeto | Haiku | 6/7 → 4/4 | 1ª rodada: achou comandos, portão, regras e prompt de segurança, mas o link para este arquivo estava quebrado. Candidato: criar este arquivo. 2ª rodada (agente novo): achou a lista, o comando de reinstalação, os bloqueios e o risco de dependência |

Lição: link do `AGENTS.md` para documento que não existe quebra a descoberta;
criar o documento antes de apontar para ele. Revalidar ao renomear documentos.
Casos de reaplicar setup, conflito de recursos, bloqueio parcial e pausa/retomada:
não rodados.

## Manter e repetir
- Repetir o setup: rodar de novo o prompt 12 do toolkit; ele preserva o que existe.
  Antes, comparar a revisão nova do toolkit com a registrada aqui.
- Rever quando: sair o Prisma 7 (dependências), um plugin pedir ESLint 10 nos
  peers, o toolkit mudar de revisão, ou um agente errar comando/regra deste repo.
- Pendências: autorizar o Context7 (`/mcp`), o `agent-browser` (next-dev-loop) e o marketplace do
  Caveman; reduzir os avisos de lint (tabela em [quality.md](quality.md)); proposta
  do Prisma 7.

## Revisão independente do setup (2026-10-31)
Revisor só leitura (subagente com o modelo principal) no intervalo `1c5783f..045c654`.
Sem regressão encontrada nas atualizações (Zod 4, Next 16, React 19); o próprio
revisor rodou os esquemas reais no Zod 4.

| Achado | Gravidade | Origem | Destino |
|---|---|---|---|
| Sem `PAINEL_SENHA`, o portão confiava em `X-Forwarded-Host` e aceitava `localhost.evil.com` | alta | já existia | **corrigido**: só o `Host` exato decide (testes novos) |
| Sem senha, a porta 3000 do Docker fica aberta na rede e o `Host` pode ser forjado direto | alta | já existia | **corrigido** (decisão do dono): Compose publica a porta só em `127.0.0.1`; testado: local 200, pela rede recusado |
| Sem senha, um site qualquer pode fazer POST no painel local (CSRF) | média | já existia | proposta: conferir `Origin` nas rotas que mudam dados |
| Login: tentativas em paralelo sem limite; cookie assinado com a própria senha; sair não revoga | baixa | já existia | proposta |
| Mensagens padrão do Zod em inglês aparecem no painel (o Zod 4 mudou o texto) | baixa | texto mudou agora | proposta: mensagens em português nos esquemas do grafo |
| `engines` aceitava Node 23; CI só testava 24 | baixa | introduzido agora | **corrigido**: `^22.19 \|\| ^24 \|\| >=26`, CI em 22 e 24 |
| Docs diziam "só abre em localhost" e "tokens criptografados" sem condição | baixa | já existia | **corrigido** no README, setup e AGENTS |
