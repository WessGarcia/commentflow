# Prompt: instalar o CommentFlow e ligar o Instagram

## Atalho (cole no seu agente)

Abra o Claude Code (ou outro agente de código) numa **pasta vazia** e cole:

```text
Leia https://raw.githubusercontent.com/gabrieltabarkiewicz/commentflow/main/docs/prompts/00-setup.md e execute tudo, do começo ao fim.
```

O agente instala, liga o painel, cria o endereço público e te conduz pela Meta.
Você só faz o que precisa ser você: clicar no site da Meta e no login do
Instagram, e colar o ID e a chave do seu app. Não precisa de Página do Facebook.

---

## Instruções para o agente

Você vai instalar o **CommentFlow** (automação de comentários e direct do
Instagram pela API oficial da Meta) para uma pessoa **leiga**, do zero até o
Instagram conectado. Fale em português simples, um passo por vez, sem jargão.
Faça você mesmo tudo que der para fazer no computador. Peça à pessoa só o que
depende dela, e espere a confirmação antes de seguir.

### Regras

- Nunca repita no chat a chave secreta do app, a `ENCRYPTION_KEY` ou o
  `IG_VERIFY_TOKEN`. Pode mostrar a senha do painel uma vez, para a pessoa anotar.
- Nunca versione nem envie o `.env` para lugar nenhum.
- Não clique, não faça login e não aceite termos no site da Meta pela pessoa:
  explique onde clicar e espere ela dizer que fez.
- Peça licença antes de instalar programas (Docker, cloudflared).
- Não mande mensagens nem comente em contas reais.
- Somente APIs oficiais da Meta, dentro dos Termos dela.
- Se algo falhar, leia a mensagem de erro, corrija e explique em uma frase o
  que houve. Não pule etapa.

### Fase 1: pegar o código e ligar o painel

1. Se a pasta atual não tiver o projeto, clone:
   `git clone https://github.com/gabrieltabarkiewicz/commentflow.git .`
   (sem git: baixe o ZIP de https://github.com/gabrieltabarkiewicz/commentflow/archive/refs/heads/main.zip e extraia aqui).
2. Confira se o **Docker** está instalado e ligado (`docker info`). Se não
   estiver, peça licença e instale o Docker Desktop
   (https://www.docker.com/products/docker-desktop/). Se a pessoa não puder
   instalar, siga com Node 22.19+ e um Postgres (`node scripts/setup.mjs --local`).
3. Rode o instalador: `node scripts/setup.mjs`. Ele cria o `.env`, gera os
   segredos e a senha do painel, sobe o app e o banco e espera ficar no ar.
4. Diga à pessoa: o painel está em `http://localhost:3000/app` e a senha é
   **(a que o instalador mostrou)**. Peça para ela anotar a senha.

### Fase 2: endereço público (a Meta precisa alcançar o painel)

Pergunte qual caminho ela prefere:

- **A) Testar no computador (grátis, agora):** um túnel do Cloudflare. O
  computador precisa ficar ligado, e o endereço muda se o túnel reiniciar.
- **B) Deixar no ar 24 h:** deploy na Render (cerca de US$ 14/mês, veja
  `docs/DEPLOY.md`). Nesse caso, guie o deploy pelo DEPLOY.md e use a URL da
  Render como endereço público. Na Render, as variáveis vão em *Environment*:
  `PAINEL_SENHA`, `APP_URL` e, depois, as chaves da Meta (ou pelo assistente
  do painel). A instalação local da Fase 1 continua útil para a pessoa
  conhecer o painel, mas o CommentFlow de verdade passa a ser o da Render: as
  Fases 3 e 4 usam o endereço da Render.

Para o caminho A:
1. Se o `cloudflared` não existir, peça licença e instale
   (Windows: `winget install --id Cloudflare.cloudflared`; Mac:
   `brew install cloudflared`; Linux: pacote oficial em
   https://developers.cloudflare.com/cloudflared/downloads/).
2. Rode **em segundo plano**, sem bloquear a conversa:
   `cloudflared tunnel --url http://localhost:3000`. Leia na saída o endereço
   `https://….trycloudflare.com`.
3. Grave: `node scripts/setup.mjs endereco https://….trycloudflare.com`. O
   comando reinicia o painel e mostra os valores para colar na Meta.
4. Confira: `node scripts/setup.mjs verificar` precisa mostrar ✓ em
   "o endereço público chega no painel" e "o webhook responde ao teste da Meta".

### Fase 3: o app na Meta (a pessoa clica, você conduz)

Abra para a pessoa o **assistente do painel**:
`https://SEU-ENDERECO/app/ligar-meta`. Ele mostra as mesmas etapas, com
botões de copiar e o status de cada uma. Conduza nesta ordem, uma etapa por
mensagem, esperando ela dizer "feito":

O login é o **do Instagram** (API do Instagram com login do Instagram): não
precisa de Página do Facebook.

1. **Instagram pronto:** conta profissional (Empresa ou Criador) e pública, com
   "Permitir acesso às mensagens" ligado (Instagram → Configurações →
   Mensagens e respostas ao story → Controles de mensagens → Ferramentas
   conectadas).
2. **Criar o app:** https://developers.facebook.com/apps/ → **Criar app** →
   caso de uso **Gerenciar mensagens e conteúdo no Instagram** (se pedir um
   portfólio empresarial, ela escolhe ou cria um). Depois, no menu da
   esquerda: **Casos de uso → API do Instagram → Configuração da API com login
   do Instagram**. As etapas 4, 5 e 6 acontecem nessa tela.
3. **Configurações do app → Básico:** colar *Domínios do app*, *URL da Política
   de Privacidade* e *URL de exclusão de dados* (rode
   `node scripts/setup.mjs coordenadas` e passe os valores), escolher
   categoria e ícone, salvar.
4. **Chaves:** no topo da tela *Configuração da API com login do Instagram*,
   peça o **ID do app do Instagram** e a **Chave secreta do app do Instagram**
   (não são os de Configurações → Básico). Ofereça dois jeitos: ela cola no
   assistente do painel (etapa "Cole o ID e a chave secreta do app"), ou cola
   aqui e você grava com
   `node scripts/setup.mjs meta --app-id ID --app-secret CHAVE`. Não repita a
   chave depois.
5. **Retorno do login:** em *Configurar o login da empresa no Instagram*, colar
   a **URL de redirecionamento OAuth**
   (`https://SEU-ENDERECO/api/auth/meta/callback`) e salvar.
6. **Webhooks:** em *Configurar webhooks*, colar a **URL de callback** e o
   **Verificar token** (os dois estão no assistente e em `coordenadas`) →
   **Verificar e salvar** → assinar `comments`, `messages` e
   `messaging_postbacks` (e `live_comments`, `message_reactions` se for usar
   esses gatilhos). Confira com `verificar`: "a Meta verificou o webhook" fica ✓.
7. **Publicar:** Modo do app → **Ao vivo**. Explique que, para a própria
   conta, não precisa de Análise do app.
8. **Conectar:** ela abre `https://SEU-ENDERECO/app/ligar-meta` (pelo endereço
   público, não pelo localhost), clica em **Conectar Instagram**, entra com a
   conta profissional e deixa todas as permissões marcadas. Confira com
   `verificar`: "Instagram conectado" fica ✓.

### Fase 4: primeira automação e teste

1. Guie a pessoa até **Automações → Nova automação**, escolhendo um modelo
   (ex.: "Enviar link automaticamente por DM"): trocar a palavra e o link,
   publicar.
2. Peça para ela comentar a palavra num post **com outra conta** do Instagram.
3. Rode `node scripts/setup.mjs verificar` até aparecer "Tudo pronto".

### Ao terminar, entregue um resumo curto

- Endereço do painel e onde está a senha (`node scripts/setup.mjs senha`).
- Se usou túnel: que ele precisa ficar ligado, e que, se o endereço mudar, é
  só subir o túnel de novo e rodar `node scripts/setup.mjs endereco <novo>`
  (e atualizar os três lugares na Meta, que o `coordenadas` lista).
- Para desligar: `docker compose down`. Para ligar de novo: `docker compose up -d`.
- O que ficou pendente, se ficou.

### Se der problema

| Sintoma | O que fazer |
|---|---|
| `docker compose` falha | Docker Desktop aberto e verde? Rode de novo. Veja `docker compose logs app`. |
| "Verificar e salvar" da Meta dá erro | `verificar` precisa mostrar o webhook ✓. Túnel ligado? Endereço igual nos dois lados? |
| Volta do login com "estado-invalido" | Ela clicou em Conectar pelo localhost: abrir pelo endereço público. |
| Volta com "sem-conta-profissional" | O Instagram não é profissional: mudar para Empresa ou Criador e conectar de novo. |
| Volta com "falha-no-token" | O ID e a chave não são os do **app do Instagram** (etapa 4), ou a URL de redirecionamento da etapa 5 está diferente da do painel. |
| "Conta conectada, mas a Meta recusou ligar os avisos" | Conferir a etapa 6 (webhook verificado e campos assinados) e clicar em Conectar Instagram de novo. |
| Comentam e nada acontece | App em Ao vivo? Campo `comments` assinado? Perfil público? Túnel ligado? |
| A resposta pública sai e o direct não | "Permitir acesso às mensagens" no Instagram. Um direct por comentário, até 7 dias. |

Para detalhes de cada tela, use o [GUIA.md](../GUIA.md).
