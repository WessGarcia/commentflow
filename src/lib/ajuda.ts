/**
 * Central de ajuda (como na Mandei). O conteúdo mora aqui, sem banco: o
 * painel lateral (navegador) e a página /app/ajuda (servidor) usam a mesma
 * busca. Módulo puro.
 */

export type Artigo = { titulo: string; resumo: string; passos: string[]; dica?: string };
export type Topico = { slug: string; icone: "instagram" | "zap" | "tag" | "inbox" | "chart"; tom: "ig" | "roxo" | "verde" | "indigo"; titulo: string; descricao: string; artigo: Artigo };
export type Faq = { p: string; r: string };

export const GUIA_URL = "https://github.com/gabrieltabarkiewicz/commentflow/blob/main/docs/GUIA.md";

export const TOPICOS: Topico[] = [
  {
    slug: "conectar-instagram", icone: "instagram", tom: "ig", titulo: "Conectar o Instagram", descricao: "Conta profissional e login pelo Facebook",
    artigo: {
      titulo: "Como conectar o seu Instagram",
      resumo: "O CommentFlow fala com o Instagram pela API oficial da Meta. Você conecta uma vez e ele responde sozinho.",
      passos: [
        "Deixe o Instagram como conta profissional (Empresa ou Criador), ligado a uma Página do Facebook que você administra.",
        "No app do Instagram, ative Configurações → Mensagens → Ferramentas conectadas → Permitir acesso às mensagens.",
        "No painel, abra Configurações e clique em Conectar Instagram.",
        "Entre com o Facebook dono da Página, escolha a Página e a conta, e aceite todas as permissões.",
      ],
      dica: "Abra o painel pelo endereço público (não pelo localhost) na hora de conectar: o login começa e termina no mesmo endereço.",
    },
  },
  {
    slug: "criar-automacao", icone: "zap", tom: "roxo", titulo: "Criar uma automação", descricao: "Modelos prontos em 3 passos",
    artigo: {
      titulo: "Como criar a sua primeira automação",
      resumo: "Comece por um modelo: troque a palavra e o link e salve. Leva um minuto.",
      passos: [
        "Em Automações, clique em + Nova automação e escolha um modelo (ou Começar do zero).",
        "Passo 1: as palavras-chave que disparam e em qual publicação vale.",
        "Passo 2: a pergunta com botão e a mensagem que entrega o link.",
        "Passo 3: a resposta pública no comentário, o nome e o botão de ligar.",
      ],
      dica: "Precisa de mais passos e botões? Use o Modo avançado, no canto do editor.",
    },
  },
  {
    slug: "palavras-chave", icone: "tag", tom: "verde", titulo: "Palavras-chave", descricao: "O que dispara a resposta",
    artigo: {
      titulo: "Como funcionam as palavras-chave",
      resumo: "Se o comentário contiver a palavra, a automação responde. Maiúsculas não importam.",
      passos: [
        "Use palavras curtas e fáceis de digitar: quero, link, eu quero.",
        "Peça na legenda do post para comentarem a palavra.",
        "Sem palavra-chave, a automação só responde se você escolher Responder qualquer comentário.",
        "Em Palavras-chaves você vê quantas vezes cada uma apareceu nos últimos 30 dias.",
      ],
    },
  },
  {
    slug: "conversas", icone: "inbox", tom: "indigo", titulo: "Conversas", descricao: "Responder o direct pelo painel",
    artigo: {
      titulo: "Como responder pelas Conversas",
      resumo: "Toda mensagem do direct chega em Conversas. Você responde por ali mesmo.",
      passos: [
        "A Meta só deixa responder até 24 horas depois da última mensagem da pessoa.",
        "Quando a janela fecha, a caixa de texto avisa: espere a pessoa escrever ou responda pelo app do Instagram.",
        "Use etiquetas e o status Em atendimento para organizar quem você está atendendo.",
        "Bloquear um contato faz a automação ignorar os comentários e directs dele.",
      ],
    },
  },
  {
    slug: "resultados", icone: "chart", tom: "roxo", titulo: "Insights e contatos", descricao: "Números, quadro e exportação",
    artigo: {
      titulo: "Como acompanhar os resultados",
      resumo: "Insights mostra o período em números; Contatos mostra cada pessoa e em que etapa ela está.",
      passos: [
        "Insights compara o período escolhido com o anterior do mesmo tamanho.",
        "Taxa de resposta = quem respondeu no direct ÷ quem recebeu o direct.",
        "No quadro de Contatos, as colunas andam sozinhas; Virou cliente e Não rolou são suas.",
        "Exportar CSV leva a base inteira para onde você quiser.",
      ],
    },
  },
];

export const FAQ: Faq[] = [
  { p: "Por que a resposta pública saiu e o direct não?", r: "Quase sempre falta ativar Permitir acesso às mensagens no app do Instagram (Configurações → Mensagens → Ferramentas conectadas). A Meta também só aceita um direct automático por comentário, e só em comentários de até 7 dias." },
  { p: "Comentaram e nada aconteceu. E agora?", r: "Confira se o app na Meta está publicado (Ao vivo), se o campo comments está assinado no webhook, se o perfil é público e se a palavra comentada está na automação. Em Comentários você vê se o aviso chegou." },
  { p: "Tem limite de contatos ou de mensagens?", r: "Não. O CommentFlow não cobra por contato nem por mensagem. Os limites são os da própria Meta para envio de mensagens." },
  { p: "Posso responder o direct pelo celular?", r: "Pode: o painel funciona no celular, e o que você responder pelo app do Instagram também aparece em Conversas." },
  { p: "Esqueci a senha do painel. O que faço?", r: "A senha é o valor de PAINEL_SENHA no arquivo .env (ou em Environment, na Render). Troque lá e reinicie o painel." },
];

const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type Resultado = { tipo: "artigo"; slug: string; titulo: string; trecho: string } | { tipo: "faq"; titulo: string; trecho: string };

/** Busca por palavras: todas precisam aparecer. O trecho é a primeira frase que bate. */
export function buscarAjuda(termo: string, limite = 8): Resultado[] {
  const palavras = normalizar(termo).split(/\s+/).filter((p) => p.length >= 2);
  if (!palavras.length) return [];
  const bate = (texto: string) => { const n = normalizar(texto); return palavras.every((p) => n.includes(p)); };
  const trechoDe = (frases: string[]) => frases.find((f) => palavras.some((p) => normalizar(f).includes(p))) ?? frases[0] ?? "";
  const out: Resultado[] = [];
  for (const t of TOPICOS) {
    const frases = [t.artigo.resumo, ...t.artigo.passos, t.artigo.dica ?? ""];
    if (bate([t.titulo, t.descricao, t.artigo.titulo, ...frases].join(" "))) out.push({ tipo: "artigo", slug: t.slug, titulo: t.artigo.titulo, trecho: trechoDe(frases) });
  }
  for (const f of FAQ) if (bate(f.p + " " + f.r)) out.push({ tipo: "faq", titulo: f.p, trecho: f.r });
  return out.slice(0, limite);
}

export const topicoPorSlug = (slug: string) => TOPICOS.find((t) => t.slug === slug) ?? null;
