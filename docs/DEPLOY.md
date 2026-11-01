# Deploy em 1 clique

A forma mais fácil de colocar o CommentFlow no ar sem Docker nem servidor na
mão. A Render sobe o app + um Postgres gerenciado a partir do `render.yaml`.

## Render (recomendado para quem não é técnico)

1. Clique no botão **Deploy to Render** no [README](../README.md) (ou acesse
   `https://render.com/deploy?repo=https://github.com/gabrieltabarkiewicz/commentflow`).
2. A Render lê o `render.yaml` e cria **o app + o banco** automaticamente. As
   migrations rodam sozinhas no primeiro boot.
3. Anote a **URL pública** do serviço (algo como
   `https://commentflow.onrender.com`).
4. No painel da Render, em **Environment**, preencha:
   - `META_APP_ID` e `META_APP_SECRET` (do seu app na Meta)
   - `META_REDIRECT_URI` = `https://SUA-URL.onrender.com/api/auth/meta/callback`
   - `PAINEL_SENHA` = uma senha forte, só sua. É ela que você digita para entrar
     no painel; sem ela o painel fica trancado.
   - `APP_URL` = `https://SUA-URL.onrender.com` (conta os cliques nos links).
   - `IG_VERIFY_TOKEN` e `ENCRYPTION_KEY` já vêm **gerados** — copie o valor do
     `IG_VERIFY_TOKEN` para usar no webhook da Meta.
5. Configure o app na Meta seguindo o [GUIA.md](GUIA.md) da Etapa 3 em diante,
   usando `https://SUA-URL.onrender.com` como endereço público:
   - **Configurar o login da empresa no Instagram → URL de redirecionamento OAuth:**
     `https://SUA-URL.onrender.com/api/auth/meta/callback`
   - **Webhook:** `https://SUA-URL.onrender.com/api/webhooks/instagram`,
     token = `IG_VERIFY_TOKEN`, assine `comments`, `messages` e
     `messaging_postbacks`.
   - **Publique o app** (modo Ao vivo); sem isso a Meta não manda os avisos.
6. Abra `https://SUA-URL.onrender.com/app/configuracoes` e clique em
   **Conectar Instagram**.

> Vantagem sobre o notebook: fica **ligado 24/7** e tem **URL pública fixa** (não
> precisa de túnel).

## Custo (seja honesto na página de vendas)
O software é sem mensalidade, mas **o servidor é pago**:
- **Render** (plano `starter`): app + Postgres ~**US$14/mês** (~R$70–80).
- **VPS enxuto** (Hetzner/Contabo + Docker, ver [GUIA.md](GUIA.md)):
  ~**R$20–30/mês**, porém exige saber mexer no servidor.

Ou seja: Render = mais caro, porém **sem dor**; VPS = barato, porém técnico.

## Alternativas
- **Railway**: também sobe por template (web + Postgres), custo parecido/menor.
- **Fly.io / VPS próprio**: mais baratos, mais técnicos.

> O `render.yaml` segue a spec da Render mas **não foi testado contra um deploy
> real** aqui — se algum plano/campo mudar no painel, ajuste por lá.
