# Guia passo a passo: ligar o CommentFlow na API oficial do Instagram

Para quem nunca fez isso. Siga na ordem, sem pular etapas. Tempo estimado:
**40 a 60 minutos**, quase todo gasto no site da Meta.

Legenda: 🖥️ no seu computador · 🌐 no site da Meta · 📱 no app do Instagram ·
✅ checagem antes de seguir.

> As telas da Meta mudam de nome e de lugar com frequência. Se um botão não
> estiver exatamente onde o guia diz, procure pelo nome parecido no menu da
> esquerda do app. O que importa é o que cada etapa precisa deixar pronto.

> **Atalhos que fazem a parte do computador por você:**
> - Com um agente (Claude Code, Codex…): cole o prompt de
>   [docs/prompts/00-setup.md](prompts/00-setup.md) e ele conduz tudo.
> - Sem agente: `node scripts/setup.mjs` instala e liga; depois o painel tem
>   **Configurações → Assistente: ligar a Meta**, com as etapas abaixo já
>   preenchidas com os seus endereços, campos para o ID e a chave do app e o
>   status de cada etapa. `node scripts/setup.mjs verificar` diz o que falta.

---

## Como a peça se encaixa (leia uma vez)

```
Alguém comenta "quero" no seu post
        │
        ▼
Meta avisa o CommentFlow  ──►  endereço público do seu painel
        │                         /api/webhooks/instagram
        ▼
CommentFlow responde o comentário e manda o direct
usando o acesso que você deu no botão "Conectar Instagram"
```

Ou seja, a Meta precisa de três coisas suas:

1. **Um app na Meta**: é a "chave" que permite ao CommentFlow falar com o
   Instagram.
2. **Um endereço público com https**: é por onde a Meta avisa o CommentFlow de
   cada comentário. `localhost` não serve, porque só existe no seu computador.
3. **Sua autorização**: o botão **Conectar Instagram** no painel.

---

## Etapa 0: o painel já está no ar 🖥️

Antes de começar, o painel precisa abrir em `http://localhost:3000/app` (com
Docker: `docker compose up --build`; veja o [README](../README.md)). Se ele
abre, siga.

✅ Você vê o painel do CommentFlow com o menu Início, Automações, Comentários,
Contatos, Palavras-chaves e Configurações.

---

## Etapa 1: deixar o Instagram pronto 📱

1. **Conta profissional.** No app do Instagram: *Configurações → Tipo de conta
   e ferramentas → Mudar para conta profissional*. Pode ser **Empresa** ou
   **Criador de conteúdo**.
2. **Perfil público.** A Meta não avisa comentários de contas privadas.
3. **Liberar o acesso às mensagens.** Sem isso, a resposta no comentário
   funciona, mas o direct não sai:
   *Configurações → Mensagens e respostas ao story → Controles de mensagens →
   Ferramentas conectadas → ative "Permitir acesso às mensagens"*.

✅ Instagram profissional, público, com "Permitir acesso às mensagens" ativado.
Não precisa de Página do Facebook: o login é pelo próprio Instagram.

---

## Etapa 2: ter um endereço público com https 🖥️

Escolha **um** dos caminhos:

### Caminho A: túnel no seu computador (bom para testar)

1. Instale o **cloudflared**:
   https://developers.cloudflare.com/cloudflared/downloads/
2. Com o painel ligado, rode num terminal:

```bash
cloudflared tunnel --url http://localhost:3000
```

3. Ele mostra um endereço parecido com
   `https://palavras-aleatorias.trycloudflare.com`. **Esse é o seu endereço
   público.** Deixe esse terminal aberto: se fechar, o endereço some.

> ⚠️ O endereço gratuito **muda toda vez** que você reinicia o túnel, e o
> computador precisa ficar ligado para as respostas saírem. Quando mudar, refaça
> as Etapas 4, 6 e 7 com o endereço novo. Para uso de verdade, prefira o
> Caminho B.

### Caminho B: servidor na nuvem (para uso diário)

Siga o [DEPLOY.md](DEPLOY.md) (Render, 1 clique). Você recebe um endereço fixo,
tipo `https://commentflow-xxxx.onrender.com`, que fica no ar 24 horas.

✅ Abrindo `SEU-ENDERECO/app` no navegador, aparece o painel.

> **Daqui em diante, "SEU-ENDERECO" é esse endereço público, sem barra no
> final.** E use o painel **sempre por ele**, não por `localhost`: assim a tela
> Configurações já mostra os links certos para copiar, e o botão Conectar
> Instagram funciona (ele precisa começar e terminar no mesmo endereço).

---

## Etapa 3: criar o app na Meta 🌐

1. Entre em https://developers.facebook.com/ com o seu Facebook. Se for a
   primeira vez, aceite virar desenvolvedor.
2. **Meus apps → Criar app.**
   - Nome: algo como `CommentFlow - SuaMarca`.
   - Caso de uso: **Gerenciar mensagens e conteúdo no Instagram**.
   - Se pedir um portfólio empresarial, escolha o seu ou crie um.
3. No menu da esquerda, abra **Casos de uso → API do Instagram →
   Configuração da API com login do Instagram**. As Etapas 5, 6 e 7 acontecem
   nessa tela.

✅ O app aparece em "Meus apps" e a tela *Configuração da API com login do
Instagram* abre.

---

## Etapa 4: configurações básicas do app 🌐

Em **Configurações do app → Básico**:

| Campo | O que colocar |
|---|---|
| Domínios do app | Só o domínio, sem `https://` (ex.: `palavras-aleatorias.trycloudflare.com`) |
| URL da Política de Privacidade | `SEU-ENDERECO/privacidade` |
| URL de exclusão de dados | `SEU-ENDERECO/privacidade` (a mesma página explica como apagar) |
| Categoria | Negócios e páginas (ou a mais próxima) |
| Ícone do app | Qualquer imagem quadrada 1024×1024 (pode ser a logo da sua marca) |

Clique em **Salvar alterações**.

✅ A página `SEU-ENDERECO/privacidade` abre no navegador.

---

## Etapa 5: colocar as chaves no CommentFlow 🖥️

Na tela **Configuração da API com login do Instagram**, no topo, copie o **ID do
app do Instagram** e a **Chave secreta do app do Instagram** (clique em
"Mostrar"). Não são o ID e a chave de *Configurações → Básico*. **Nunca mostre a
chave a ninguém.**

Gere dois códigos aleatórios. No terminal, na pasta do projeto:

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

O primeiro é o **token do webhook**; o segundo, a **chave de criptografia**.

Abra o arquivo `.env` na pasta do projeto (se não existir, copie o
`.env.example` com o nome `.env`) e preencha:

```
META_APP_ID="o ID do app do Instagram"
META_APP_SECRET="a chave secreta do app do Instagram"
META_REDIRECT_URI="SEU-ENDERECO/api/auth/meta/callback"
IG_VERIFY_TOKEN="o primeiro código gerado"
ENCRYPTION_KEY="o segundo código gerado"
PAINEL_SENHA="uma senha forte, só sua"
APP_URL="SEU-ENDERECO"
```

A `PAINEL_SENHA` é a senha para entrar no painel. **Ela é obrigatória para
abrir o painel pelo endereço público**: sem ela, o painel só abre no próprio
computador (`localhost`) e, de fora, aparece "Painel trancado". Assim ninguém
que descobrir o seu endereço consegue mexer nas suas automações.

Deixe `IG_ACCESS_TOKEN` e `IG_USER_ID` **vazios**: o acesso vem pelo botão
Conectar Instagram.

> **Não perca a `ENCRYPTION_KEY`.** Os acessos ficam guardados criptografados
> com ela. Se trocar, é só conectar o Instagram de novo.

**Reinicie o painel** para ele ler o `.env` novo (Docker: `Ctrl + C` e
`docker compose up` de novo). No Caminho B (Render), preencha esses campos em
*Environment* e salve; a Render reinicia sozinha.

✅ No painel, em **Configurações → App na Meta**, as linhas "ID do app",
"Chave secreta" e "Token do webhook" aparecem como **Pronto**, e em
**Segurança** "Acessos criptografados" e "Senha do painel" também. Ao abrir
`SEU-ENDERECO/app`, o painel pede a senha.

---

## Etapa 6: liberar o retorno do login 🌐

Na tela **Configuração da API com login do Instagram**, em **Configurar o login
da empresa no Instagram**:

1. Em **URL de redirecionamento OAuth**, cole:
   `SEU-ENDERECO/api/auth/meta/callback`
   (no painel, em *Configurações → Webhook → Volta do login do Instagram*, tem o
   link pronto com botão **Copiar**).
2. **Salvar.**

✅ O endereço aparece na lista, **idêntico** ao do `.env`, letra por letra.

---

## Etapa 7: ligar os avisos (webhook) 🌐

Na tela **Configuração da API com login do Instagram**, em **Configurar
webhooks**:

1. **URL de callback:** `SEU-ENDERECO/api/webhooks/instagram`
   (no painel: *Configurações → Webhook → Endereço do webhook → Copiar*).
2. **Verificar token:** o mesmo `IG_VERIFY_TOKEN` do `.env`.
3. Clique em **Verificar e salvar**. O painel precisa estar ligado nessa hora.
4. Na lista de campos, ligue (**Assinar**) estes três:
   - `comments`: os comentários
   - `messages`: os directs e os toques nos botões
   - `messaging_postbacks`: toques em botões de alguns aparelhos
   - `live_comments` *(opcional)*: só se for usar o gatilho **Comentário na live**
   - `message_reactions` *(opcional)*: só se for usar o gatilho **Reação no direct**

   Resposta e menção no story chegam pelo campo `messages`, que você já assinou.

✅ A Meta aceitou o endereço (sem erro vermelho) e os três campos aparecem como
assinados.

---

## Etapa 8: publicar o app 🌐

A Meta **só manda os avisos de comentário quando o app está publicado**.

1. No topo do painel do app, mude **Modo do app** de *Desenvolvimento* para
   **Ao vivo** (em algumas telas: menu **Publicar**).
2. Se a Meta apontar algo faltando, normalmente é da Etapa 4 (política de
   privacidade, exclusão de dados, ícone ou categoria). Complete e tente de
   novo.

> **Precisa de "Análise do app" (App Review)?** Para usar na **sua própria
> conta**, não. Sem a análise, as permissões funcionam para quem tem função no
> app (administrador, desenvolvedor ou testador), e você é o administrador. A
> análise só é necessária se você quiser conectar contas de **outras
> pessoas** que não têm função no seu app.
>
> Se for conectar o Instagram de **outra pessoa**, adicione essa conta em
> **Funções do app → Funções → Testadores do Instagram** e peça para ela aceitar
> o convite no Instagram (*Configurações → Apps e sites → Convites de teste*).

✅ O topo do painel do app mostra **Ao vivo** (ou "Publicado").

---

## Etapa 9: conectar o Instagram no painel 🖥️

1. Abra **`SEU-ENDERECO/app/configuracoes`** (pelo endereço público, não pelo
   localhost).
2. Clique em **Conectar Instagram**.
3. Abre o login do **Instagram**. Entre com a conta profissional e deixe
   **todas as permissões marcadas**.
4. Você volta para Configurações com a mensagem verde **"1 conta(s)
   conectada(s)"**.

Nesse momento o CommentFlow também liga os avisos da sua conta para o app. Se
aparecer o aviso *"Conta conectada, mas a Meta recusou ligar os avisos"*,
confira a Etapa 7 e clique em **Conectar Instagram** de novo.

O acesso do Instagram vale 60 dias e o CommentFlow renova sozinho enquanto
estiver recebendo comentários. Se o painel ficar parado mais de 60 dias, ele
avisa para conectar de novo.

✅ Em **Configurações → Instagram** aparece o seu `@usuario` com a etiqueta
**Conectada**, e no canto da barra lateral o cartão Instagram mostra a conta.

---

## Etapa 10: criar a primeira automação 🖥️

1. Menu **Automações → Nova automação**. O pop-up de modelos filtra por
   objetivo e por gatilho: comentário no post, comentário na live, resposta ao
   story, menção no story ou reação no direct.
2. Preencha:
   - **Nome da automação:** `Teste`
   - **Onde:** Todos os posts
   - **Quando:** Comentar a palavra-chave
   - **Palavras-chave:** `quero` (uma por linha)
   - **Resposta pública no comentário:** `Te mandei no direct! 💜`
   - **Mensagem no direct:**
     - **Uma mensagem**: um texto só, por exemplo o link; ou
     - **Conversa com botões**: passos com botões (até 20 letras cada). Cada
       botão leva a outro passo ou **encerra**.
3. Confira na **Prévia**, ao lado, o que o seguidor vai ver.
4. Deixe **Ativa** ligada e clique em **Criar automação**.

✅ A automação aparece na lista como **Ativa**, e a palavra aparece em
**Palavras-chaves**.

---

## Etapa 11: testar de verdade 📱

1. Com **outra conta** do Instagram (de um amigo, ou uma segunda conta sua),
   comente `quero` num post da conta conectada.
2. Em poucos segundos:
   - a **resposta pública** aparece embaixo do comentário;
   - chega o **direct** na outra conta;
   - se for conversa com botões, toque num botão e veja chegar o próximo passo.
3. No painel:
   - **Comentários** mostra o comentário como **Respondido**;
   - **Contatos** mostra quem comentou;
   - **Início** atualiza os números.

✅ Os três itens do passo 2 aconteceram. Está tudo ligado. 🎉

---

## Se algo não funcionar 🔧

| O que acontece | O que fazer |
|---|---|
| "Verificar e salvar" do webhook dá erro | O painel precisa estar ligado e abrindo em `SEU-ENDERECO/app`. O token na Meta tem que ser **idêntico** ao `IG_VERIFY_TOKEN`. Depois de mudar o `.env`, reinicie o painel. |
| Erro de "URL bloqueada" ou "redirect_uri" ao conectar | O endereço da Etapa 6 tem que ser igual, letra por letra, ao `META_REDIRECT_URI` do `.env`. |
| Volta com "estado-invalido" | Você clicou em Conectar pelo `localhost`. Abra o painel pelo **endereço público** e tente de novo. |
| Volta com "sem-conta-profissional" | O Instagram não é profissional. Revise a Etapa 1 e conecte de novo. |
| Volta com "falha-no-token" | O ID ou a chave do `.env` não são os do **app do Instagram** (Etapa 5), ou o endereço da Etapa 6 está diferente. |
| Comentam e nada aparece em Comentários | Os avisos não estão chegando. Confira: app **Ao vivo** (Etapa 8), campo `comments` assinado (Etapa 7), túnel ainda aberto e com o mesmo endereço, perfil **público**. Depois clique em Conectar Instagram de novo. |
| Aparece em Comentários como **Com erro** | O comentário chegou, mas a Meta recusou a resposta. Conecte o Instagram de novo, aceitando **todas** as permissões. |
| A resposta pública sai, o direct não | Ative **"Permitir acesso às mensagens"** (Etapa 1, item 3). Cada comentário aceita **um** direct automático, e só se o comentário tiver até 7 dias. |
| Os botões do direct não respondem | Assine os campos `messages` e `messaging_postbacks` (Etapa 7). |
| Funciona para você, mas não para outra conta que comenta | Com o app sem Análise, a Meta às vezes só entrega para contas com função no app. Para testar, adicione a conta como **Testador do Instagram** em *Funções do app*. |
| O endereço do túnel mudou | Refaça as Etapas 4 (domínio e privacidade), 5 (`META_REDIRECT_URI`), 6 e 7 com o endereço novo e reinicie o painel. |
| Painel mostra "O banco de dados não respondeu" | O banco de dados não está ligado. Com Docker, rode `docker compose up` de novo. |

---

## Regras da Meta que valem para todo mundo

- **Um direct automático por comentário.**
- **Comentários com mais de 7 dias** não recebem direct automático.
- **Depois que a pessoa responde ou toca num botão**, a conversa fica aberta por
  24 horas para os próximos passos.
- Use mensagens úteis e que a pessoa pediu. Spam leva a bloqueio da conta pela
  Meta.
