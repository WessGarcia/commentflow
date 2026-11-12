# PRODUCT — CommentFlow

## Problema
Marcas e criadores recebem muitos comentários no Instagram e perdem vendas e
engajamento por não responder na hora. Fazer isso na mão não escala.

## Público
Criadores, infoprodutores, social media e pequenas lojas que usam Instagram
como canal de aquisição e querem responder comentários e enviar DMs em escala,
dentro das regras da plataforma.

## MVP
- Conectar uma conta Instagram Business via OAuth (sem colar token).
- Automação por comentário: ao detectar um comentário (qualquer um ou por
  palavra-chave), responder publicamente e/ou enviar DM.
- DM em fluxo multi-passo com botões (quick replies) que avançam a conversa.
- Painel para criar/editar/ativar/excluir fluxos e ver o log de atividade.

## Fluxos principais
1. **Conexão:** usuário clica "Conectar Instagram" → login unificado da Meta
   (Login do Facebook para Empresas com `config_id`) → token de usuário do
   sistema salvo criptografado.
2. **Comentário → ação:** webhook de `comments` → match de fluxo → resposta
   pública (variações) + DM (simples ou passo de entrada do fluxo).
3. **Botão → próximo passo:** webhook de `messages` (quick_reply/postback) →
   envia o passo alvo da DM.

## Requisitos
- API oficial da Meta (API do Instagram com login unificado, `graph.facebook.com`).
- Conta Instagram profissional (Empresa ou Criador).
- Permissões (definidas na configuração do login): `instagram_basic`,
  `instagram_manage_comments`, `instagram_manage_messages`.

## Restrições
- Somente APIs oficiais; respeitar Termos da Meta, limites de API e políticas
  antispam.
- Não copiar, clonar ou redistribuir produtos de terceiros.
- Segredos nunca versionados; tokens criptografados em repouso.

## Hipóteses (reversíveis)
- Começo single-tenant (uma instância por cliente), multiusuário depois.
- Planos de preço são placeholders a ajustar.
- Fila síncrona no v0; BullMQ/Redis quando o volume exigir.

## Critérios de aceitação
- Conectar conta pelo painel sem colar token.
- Criar um fluxo por palavra-chave com resposta pública + DM com botões.
- Comentar a palavra-chave dispara resposta pública e DM; tocar num botão
  entrega o passo seguinte; tudo aparece no log de atividade.
- `docker compose up --build` sobe app + banco e aplica migrations.
