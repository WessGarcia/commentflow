import type { DmFlow } from "@/lib/flowTypes";
import { GATILHOS, tipoDe, type TipoGatilho } from "@/lib/gatilhos";

/**
 * Modelos de automação: o pop-up "Modelos" que abre em "+ Nova automação" e o
 * cartão "Modelos para você" da tela Automações. Cada modelo abre o editor de
 * três passos já preenchido; a pessoa troca a palavra e o link e salva.
 *
 * Só entra modelo do que o CommentFlow FAZ: comentário → resposta pública e
 * direct (com ou sem botão). Nada de story, live ou IA.
 *
 * A mecânica: a primeira mensagem pergunta com um botão; o toque da pessoa
 * abre a conversa de 24 h e o link chega na segunda mensagem.
 */
export type Objetivo = "seguidores" | "engajar" | "trafego" | "vender";
export const OBJETIVOS: { id: Objetivo; rotulo: string }[] = [
  { id: "trafego", rotulo: "Direcionar tráfego" },
  { id: "vender", rotulo: "Vender no direct" },
  { id: "engajar", rotulo: "Engajar seu público" },
  { id: "seguidores", rotulo: "Aumentar seguidores" },
];

/** O formulário de três passos. É o que o editor simples edita. */
export type Simples = {
  /** o que dispara: comentário, live, story, menção ou reação (lib/gatilhos.ts) */
  tipo: TipoGatilho;
  nome: string;
  palavras: string[];
  /** true = qualquer comentário dispara, sem palavra-chave */
  qualquer: boolean;
  /** "" = todas as publicações */
  postId: string;
  /** 1ª mensagem com botão; vazia = só a entrega, sem botão */
  pergunta: string;
  botao: string;
  /** 2ª mensagem (ou a única); vazia = não manda direct */
  entrega: string;
  link: string;
  publicas: string[];
  ativo: boolean;
};

export type Modelo = {
  id: string;
  nome: string;
  descricao: string;
  objetivo: Objetivo;
  selo: "popular" | "novo" | null;
  recomendado?: boolean;
  /** o gatilho do modelo; sem nada, é comentário */
  tipo?: TipoGatilho;
  s: Omit<Simples, "nome" | "postId" | "link" | "ativo" | "tipo"> & { tipo?: TipoGatilho };
};

const PUBLICAS = ["Te mandei no direct, dá uma olhada lá 💜", "Mandei lá no direct 👀", "Chegou aí no direct, confere", "Já está no seu direct!"];

export const MODELOS: Modelo[] = [
  {
    id: "link-por-dm",
    nome: "Enviar link automaticamente por DM",
    descricao: "Envie um link sempre que alguém comentar a palavra-chave em um post ou reel.",
    objetivo: "trafego", selo: "popular", recomendado: true,
    s: {
      palavras: ["link", "quero", "manda"], qualquer: false, publicas: PUBLICAS,
      pergunta: "Opa, vi seu comentário! Quer que eu te mande o link aqui?", botao: "Quero",
      entrega: "Aqui está: {link}\n\nQualquer dúvida é só responder aqui 🙌",
    },
  },
  {
    id: "material-gratis",
    nome: "Material grátis para quem comenta",
    descricao: "Entregue um e-book, aula ou checklist para quem comentar e agradeça o interesse.",
    objetivo: "engajar", selo: "popular", recomendado: true,
    s: {
      palavras: ["quero", "eu quero", "material"], qualquer: false, publicas: PUBLICAS,
      pergunta: "Que bom que você quer o material! Te mando aqui no direct?", botao: "Quero sim",
      entrega: "Prontinho, aqui está o seu material: {link}\n\nDepois me conta o que achou 💜",
    },
  },
  {
    id: "preco-no-direct",
    nome: "Mandar o preço no direct",
    descricao: "Quem pergunta “quanto custa” nos comentários recebe os detalhes e o valor no privado.",
    objetivo: "vender", selo: null, recomendado: true,
    s: {
      palavras: ["preço", "valor", "quanto"], qualquer: false, publicas: ["Te mandei os detalhes no direct 💜", "Mandei o valor no seu direct!", "Olha seu direct, mandei tudo lá"],
      pergunta: "Oi! Vi que você perguntou o valor. Quer que eu te mande os detalhes aqui?", botao: "Quero ver",
      entrega: "Aqui estão todos os detalhes e o valor: {link}\n\nSe ficar com alguma dúvida, é só me responder aqui.",
    },
  },
  {
    id: "palavra-chave",
    nome: "Automação com palavra-chave",
    descricao: "Responda automaticamente quem usar uma palavra específica nos comentários.",
    objetivo: "trafego", selo: "novo",
    s: {
      palavras: ["eu quero"], qualquer: false, publicas: PUBLICAS,
      pergunta: "Vi seu comentário! Te mando aqui?", botao: "Manda",
      entrega: "Aqui: {link}",
    },
  },
  {
    id: "cupom",
    nome: "Cupom de desconto por comentário",
    descricao: "Quem comenta a palavra recebe um cupom exclusivo e o link da loja.",
    objetivo: "vender", selo: null,
    s: {
      palavras: ["cupom", "desconto"], qualquer: false, publicas: ["Seu cupom chegou no direct 🎁", "Mandei o cupom no seu direct!", "Corre no direct, o cupom está lá"],
      pergunta: "Separei um cupom só para quem comentou! Quer receber?", botao: "Quero o cupom",
      entrega: "Seu cupom: SEUCUPOM10 🎁\nUse aqui: {link}",
    },
  },
  {
    id: "lista-de-espera",
    nome: "Lista de espera de lançamento",
    descricao: "Leve quem comenta para o grupo ou página da lista de espera antes de abrir as vendas.",
    objetivo: "vender", selo: null,
    s: {
      palavras: ["lista", "eu quero"], qualquer: false, publicas: PUBLICAS,
      pergunta: "Quer entrar na lista de espera e ser avisado(a) antes de todo mundo?", botao: "Quero entrar",
      entrega: "Pronto! Entre na lista por aqui: {link}\n\nVocê vai ser o primeiro a saber 🚀",
    },
  },
  {
    id: "link-da-aula",
    nome: "Link da aula ou da live",
    descricao: "Mande o link da aula, live ou evento para quem comentar.",
    objetivo: "trafego", selo: null,
    s: {
      palavras: ["aula", "live", "link"], qualquer: false, publicas: PUBLICAS,
      pergunta: "", botao: "",
      entrega: "Aqui está o link: {link}\n\nTe vejo lá! 🎥",
    },
  },
  {
    id: "sorteio",
    nome: "Confirmar participação no sorteio",
    descricao: "Quem comenta recebe a confirmação e o regulamento, e é lembrado de seguir o perfil.",
    objetivo: "seguidores", selo: null,
    s: {
      palavras: ["participo", "eu", "quero"], qualquer: false, publicas: ["Participação registrada! Olha o direct 🍀", "Confere o direct 🍀", "Te mandei os detalhes no direct!"],
      pergunta: "Sua participação está quase confirmada! Você já segue o perfil?", botao: "Já sigo",
      entrega: "Participação confirmada! 🍀\nRegulamento e resultado aqui: {link}",
    },
  },
  {
    id: "agradecer-comentarios",
    nome: "Agradecer todo comentário",
    descricao: "Responda publicamente qualquer comentário, com variações para não parecer robô.",
    objetivo: "engajar", selo: null,
    s: {
      palavras: [], qualquer: true, publicas: ["Obrigado pelo comentário! 💜", "Valeu demais! 🙌", "Que bom que você gostou!", "Amei seu comentário 💜"],
      pergunta: "", botao: "",
      entrega: "",
    },
  },
  {
    id: "mencao-no-story",
    nome: "Agradecer menção no story",
    descricao: "Quando alguém marcar você num story, agradeça e mande um presente no direct.",
    objetivo: "engajar", selo: "novo", tipo: "story_mencao",
    s: {
      tipo: "story_mencao", palavras: [], qualquer: true, publicas: [],
      pergunta: "Vi que você me marcou no story, obrigado! 💜 Quer um presente por isso?", botao: "Quero",
      entrega: "Aqui está o seu presente: {link}",
    },
  },
  {
    id: "leads-pelos-stories",
    nome: "Capturar leads pelos stories",
    descricao: "Quem responder o story com a palavra-chave recebe o material no direct.",
    objetivo: "vender", selo: null, tipo: "story_resposta",
    s: {
      tipo: "story_resposta", palavras: ["quero", "eu quero"], qualquer: false, publicas: [],
      pergunta: "", botao: "",
      entrega: "Que bom que você quer! Aqui está o material completo: {link}",
    },
  },
  {
    id: "comentario-na-live",
    nome: "Link durante a live",
    descricao: "Quem comentar a palavra durante a live recebe o link no direct na hora.",
    objetivo: "trafego", selo: null, tipo: "live",
    s: {
      tipo: "live", palavras: ["link", "quero"], qualquer: false, publicas: [],
      pergunta: "Oi! Vi seu comentário na live. Quer o link aqui?", botao: "Quero",
      entrega: "Aqui está: {link}\n\nAproveita que a live ainda está no ar 🔴",
    },
  },
  {
    id: "reacao-no-direct",
    nome: "Responder quem reage no direct",
    descricao: "Quando alguém reagir a uma mensagem sua, puxe a conversa.",
    objetivo: "engajar", selo: null, tipo: "reacao",
    s: {
      tipo: "reacao", palavras: [], qualquer: true, publicas: [],
      pergunta: "", botao: "",
      entrega: "Vi sua reação 😄 Posso te ajudar com mais alguma coisa?",
    },
  },
];

export const linkDoModelo = (id: string) => `/app/automacao?modelo=${id}`;

export function simplesEmBranco(): Simples {
  return { tipo: "comentario", nome: "", palavras: [], qualquer: false, postId: "", pergunta: "", botao: "Quero", entrega: "", link: "", publicas: [], ativo: true };
}

export function simplesDoModelo(id: string): Simples | null {
  const m = MODELOS.find((x) => x.id === id);
  if (!m) return null;
  return { ...simplesEmBranco(), ...m.s, tipo: m.s.tipo ?? "comentario", palavras: [...m.s.palavras], publicas: [...m.s.publicas], nome: m.nome };
}

type FluxoSalvo = {
  name: string;
  tipo?: string;
  enabled: boolean;
  scope: string;
  mediaId: string | null;
  matchType: string;
  keywords: string[];
  publicReplies: string[];
  dmMessage: string | null;
  dmFlow: DmFlow | null;
  grafo?: unknown;
};

/**
 * Lê uma automação salva de volta para o formulário de três passos. Devolve
 * null quando ela não cabe nele (conversa com mais de dois passos ou mais de
 * um botão): essa abre no modo avançado.
 */
export function simplesDoFluxo(f: FluxoSalvo): Simples | null {
  if (f.grafo) return null; // feito no construtor visual: só abre lá
  const base: Simples = {
    ...simplesEmBranco(),
    tipo: tipoDe(f.tipo),
    nome: f.name,
    ativo: f.enabled,
    palavras: f.matchType === "KEYWORD" ? f.keywords : [],
    qualquer: f.matchType === "ANY",
    postId: f.scope === "SPECIFIC_POST" ? (f.mediaId ?? "") : "",
    publicas: f.publicReplies,
  };
  if (!f.dmFlow) return { ...base, entrega: f.dmMessage ?? "" };

  const passos = Object.keys(f.dmFlow.steps);
  const inicio = f.dmFlow.steps[f.dmFlow.entry];
  const botoes = inicio?.quickReplies ?? [];
  if (!inicio) return null;
  if (passos.length === 1 && botoes.length === 0) return { ...base, entrega: inicio.text };
  if (passos.length !== 2 || botoes.length !== 1 || !botoes[0].next) return null;
  const segundo = f.dmFlow.steps[botoes[0].next];
  if (!segundo || (segundo.quickReplies ?? []).length) return null;
  return { ...base, pergunta: inicio.text, botao: botoes[0].title, entrega: segundo.text };
}

/** Onde a automação abre: quem cabe nos três passos abre no simples, o resto no modo avançado. */
export const linkDoFluxo = (f: FluxoSalvo & { id: string }) => (simplesDoFluxo(f) ? `/app/automacao?editar=${f.id}` : `/app/automacao?avancado=1&editar=${f.id}`);

export const comLink = (texto: string, link: string) => texto.split("{link}").join(link.trim());

/** O corpo que vai para /api/flows. */
export function payloadDoSimples(s: Simples) {
  const entrega = comLink(s.entrega, s.link).trim();
  const pergunta = s.pergunta.trim();
  const dmFlow: DmFlow | null =
    pergunta && entrega
      ? { entry: "s1", steps: { s1: { text: pergunta, quickReplies: [{ title: s.botao.trim() || "Quero", next: "s2" }] }, s2: { text: entrega, quickReplies: [] } } }
      : null;
  const g = GATILHOS[s.tipo];
  const qualquer = g.palavras === "nenhuma" || s.qualquer;
  return {
    name: nomeSugerido(s),
    tipo: s.tipo,
    enabled: s.ativo,
    scope: g.post && s.postId.trim() ? "SPECIFIC_POST" : "ALL_POSTS",
    mediaId: g.post ? s.postId.trim() || null : null,
    matchType: qualquer ? "ANY" : "KEYWORD",
    keywords: qualquer ? [] : s.palavras.map((p) => p.trim()).filter(Boolean),
    publicReplies: g.publica ? s.publicas.map((p) => p.trim()).filter(Boolean) : [],
    dmMessage: dmFlow ? null : entrega || null,
    dmFlow,
  };
}

export function nomeSugerido(s: Simples) {
  if (s.nome.trim()) return s.nome.trim();
  if (GATILHOS[s.tipo].palavras === "nenhuma") return GATILHOS[s.tipo].rotulo;
  if (s.qualquer) return s.tipo === "comentario" ? "Qualquer comentário" : GATILHOS[s.tipo].rotulo;
  const p = s.palavras.filter(Boolean);
  return p.length ? `Palavra “${p[0]}”` : "Nova automação";
}

/** O que ainda falta para seguir do passo. A primeira frase aparece em amarelo. */
export function faltaNoPasso(s: Simples, passo: 1 | 2 | 3): string[] {
  const falta: string[] = [];
  const g = GATILHOS[s.tipo];
  if (passo === 1) {
    if (g.palavras !== "nenhuma" && !s.qualquer && !s.palavras.some((p) => p.trim())) falta.push("Escreva ao menos uma palavra-chave (digite e aperte Enter).");
    if (g.post && s.postId !== "" && !s.postId.trim()) falta.push("Toque na publicação (ou cole o ID) ou escolha “Todas as publicações”.");
  }
  if (passo === 2) {
    if (s.pergunta.trim() && !s.entrega.trim()) falta.push("Escreva a mensagem que chega depois do botão.");
    if (s.pergunta.trim() && !s.botao.trim()) falta.push("Escreva o texto do botão.");
    if (s.entrega.includes("{link}") && !s.link.trim()) falta.push("Cole o link que vai no lugar de {link}.");
    if (s.link.trim() && !/^https?:\/\//i.test(s.link.trim())) falta.push("O link precisa começar com https://");
  }
  if (passo === 3) {
    if (!s.entrega.trim() && !(g.publica && s.publicas.some((p) => p.trim()))) falta.push(g.publica ? "A automação precisa fazer algo: escreva uma resposta pública ou volte e escreva o direct." : "Volte ao passo 2 e escreva a mensagem do direct.");
  }
  return falta;
}
