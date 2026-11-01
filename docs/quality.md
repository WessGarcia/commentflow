# Qualidade

## Comandos
| Comando | O que faz | Quando |
|---|---|---|
| `npm run check` | lint + tipos + testes + autochecagem das regras de lint | antes de dar qualquer mudança por pronta |
| `npm run lint` | ESLint (perfil leve do Next + regras em `eslint-rules/`) | parte do `check` |
| `npm run lint:typed` | promessas soltas ou mal usadas, com tipos (~90 s) | mudanças em código assíncrono; roda no CI |
| `npm run typecheck` | `tsc --noEmit` | parte do `check` |
| `npm test` | Vitest (`src/**/*.test.ts`) | parte do `check` |
| `npm run verify:rules` | autochecagem das regras de `eslint-rules/` | parte do `check` |
| `npm run build` | build de produção (Turbopack) | antes de publicar; pode rodar com o `dev` ligado |

O CI (`.github/workflows/check.yml`) roda `npm ci`, `check`, `lint:typed` e
`build` em cada push e pull request. Não publica, não usa segredos, não precisa de banco.

## O que os testes cobrem
- Assinatura do webhook da Meta (`signature.test.ts`).
- Tokens criptografados: ida e volta, IV novo, adulteração, troca de chave (`crypto.test.ts`).
- Sessão do painel: validade, troca de senha, cookie forjado (`sessao.test.ts`).
- Portão do painel (`proxy.test.ts`): rotas livres, 401 na API, redirecionamento com volta, localhost sem senha, `X-Forwarded-Host` e `Host` forjados.
- Grafo do construtor: padrões do esquema, validação, ligações, conversão de automações antigas (`grafo.test.ts`).
- Validação da API de automações e conversa antiga com botões (`validation.test.ts`).
- Colunas do quadro de contatos (`quadro.test.ts`).
- Quando renovar o token de 60 dias do login do Instagram (`credentials.test.ts`).

Não cobrem ainda: motor de execução (`motor.ts`), processamento de comentários e
mensagens com o banco, chamadas reais à Graph API. Isso segue no teste de ponta a
ponta do [GUIA.md](GUIA.md) e em testes com servidor falso da Meta (`GRAPH_BASE_URL`).

## Avisos de lint conhecidos (regras novas com violações antigas)
Começam como aviso; regra sem violação é erro. Reduzir ao mexer no arquivo.

| Regra | Avisos (2026-10-31) | Onde | Como reduzir |
|---|---|---|---|
| `quality/max-lines` (350) | 4 | `construtor.tsx` 590, `conversas.tsx` 408, `simples.tsx` 384, `_ui/ui.tsx` 356 | dividir por responsabilidade (proposta à parte) |
| `react-hooks/static-components` | 10 | `fluxos/lista.tsx`, `ligar-meta/assistente.tsx` | tirar os componentes de dentro da função |
| `react-hooks/set-state-in-effect` | 8 | painel (carregamentos em `useEffect`) | derivar estado ou carregar fora do efeito |
| `react-hooks/purity` | 1 | `insights/grafico.tsx` (`Date.now` no render) | calcular fora do render |
| `no-floating-promises` (tipado) | 11 | painel | `void` explícito ou `await` com tratamento |
| `no-misused-promises` (tipado) | 35 | `onClick={async …}` no painel | envolver o handler |

## Estado verificado (2026-10-31)
- `npm run check`: passa (0 erros de lint, 23 avisos; 47 testes).
- `npm run build` (Next 16.4.3, Turbopack): passa; rota `Proxy` presente.
- Servidor de produção local (`next start`): 16 rotas da fumaça com o status
  esperado; com `PAINEL_SENHA`, `/app` redireciona para `/entrar`, API dá 401 sem
  cookie, login gera cookie e libera; webhook continua livre.
- Painel de desenvolvimento: construtor visual (React Flow) abre sem erro no console.
- Auditoria (`npm audit --omit=dev`): ver [docs/harness.md](harness.md#dependências).

Ainda **não testado com dados reais da Meta** (exige conta e app). A validação de
ponta a ponta (conectar conta, comentar, tocar no botão) segue o [GUIA.md](GUIA.md).

## Checklist de aceitação
- [ ] `npm run check` e `npm run build` passam.
- [ ] `docker compose up` sobe app + banco e aplica as migrations.
- [ ] Landing (`/`) e painel (`/app`) carregam.
- [ ] OAuth conecta a conta e salva o token (criptografado).
- [ ] Comentário dispara resposta pública + DM.
- [ ] Botão da DM entrega o passo seguinte.
- [ ] Ações aparecem em Atividade.

## Revisões
- Segurança: [prompts/13-revisao-seguranca.md](prompts/13-revisao-seguranca.md)
  (repositório ou diff; relatório privado fora do repo).
- Harness (instruções e ferramentas de agente): método em [docs/harness.md](harness.md#avaliar-e-melhorar-o-harness).
