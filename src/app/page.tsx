import Link from "next/link";

export const metadata = {
  title: "CommentFlow — automação de comentários do Instagram",
  description:
    "Responda cada comentário e envie a DM certa automaticamente, pela API oficial da Meta. Crie o fluxo uma vez; ele trabalha 24/7.",
};

const steps = [
  {
    n: 1,
    title: "Conecte seu Instagram",
    text: "Um clique, login pelo Facebook. Sem copiar token na mão.",
  },
  {
    n: 2,
    title: "Crie um fluxo",
    text: "Escolha a palavra-chave e o que responder: comentário e/ou DM.",
  },
  {
    n: 3,
    title: "Deixe rodar",
    text: "Comentou, o CommentFlow responde e manda a DM sozinho, 24/7.",
  },
];

const features = [
  {
    title: "Resposta automática a comentários",
    text: "Responda publicamente na hora, com variações pra não parecer robô.",
  },
  {
    title: "Comentário → Direct",
    text: "Dispare uma DM assim que a pessoa comenta — o clássico que converte.",
  },
  {
    title: "Gatilhos flexíveis",
    text: "Por palavra-chave ou qualquer comentário; em todos os posts ou num só.",
  },
  {
    title: "Fluxos sob seu controle",
    text: "Crie, edite, ative e desative tudo no painel, sem programar.",
  },
  {
    title: "Multiconta",
    text: "Conecte mais de uma conta e gerencie todas no mesmo lugar.",
  },
  {
    title: "Histórico e evidência",
    text: "Veja cada ação no log de atividade, com o retorno da API.",
  },
  {
    title: "API oficial da Meta",
    text: "Nada de gambiarra: Instagram Graph API, dentro das regras.",
  },
  {
    title: "Autohospedável",
    text: "Rode no seu servidor. Seus dados e seus tokens ficam com você.",
  },
];

const metrics = [
  { value: "24/7", label: "respondendo sem parar" },
  { value: "< 5s", label: "pra responder um comentário" },
  { value: "0", label: "comentário perdido" },
];

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    per: "/sempre",
    featured: false,
    features: ["1 conta", "1 fluxo ativo", "100 DMs por mês", "Log de atividade"],
    cta: "Começar grátis",
  },
  {
    name: "Pro",
    price: "R$ 49",
    per: "/mês",
    featured: true,
    features: [
      "3 contas",
      "Fluxos ilimitados",
      "5.000 DMs por mês",
      "Variações de resposta",
    ],
    cta: "Assinar o Pro",
  },
  {
    name: "Business",
    price: "R$ 149",
    per: "/mês",
    featured: false,
    features: [
      "Contas ilimitadas",
      "Multiusuário",
      "DMs ilimitadas",
      "Suporte prioritário",
    ],
    cta: "Falar com vendas",
  },
];

const faqs = [
  {
    q: "É oficial? Minha conta corre risco?",
    a: "Sim, usa a API oficial da Meta (Instagram Graph API). Use dentro dos termos da plataforma e dos limites de API.",
  },
  {
    q: "Preciso saber programar?",
    a: "Não. Você conecta a conta e cria os fluxos clicando no painel.",
  },
  {
    q: "Posso rodar no meu próprio servidor?",
    a: "Pode. O CommentFlow é autohospedável — sobe com um comando via Docker.",
  },
  {
    q: "Funciona com qual conta?",
    a: "Conta Instagram Business ou Creator ligada a uma Página do Facebook.",
  },
];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-inner">
          <div className="lp-brand">
            <span className="brand-dot" /> CommentFlow
          </div>
          <nav className="lp-nav-links">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#precos">Preços</a>
            <Link href="/app">Entrar</Link>
            <Link className="lp-btn lp-btn-primary" href="/app">
              Começar grátis
            </Link>
          </nav>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-inner">
          <span className="lp-badge">Automação para Instagram</span>
          <h1>Transforme comentários do Instagram em conversas e vendas.</h1>
          <p>
            O CommentFlow responde cada comentário e manda a DM certa na hora,
            pela API oficial da Meta. Você cria o fluxo uma vez — ele trabalha
            sozinho.
          </p>
          <div className="lp-hero-cta">
            <Link className="lp-btn lp-btn-primary" href="/app">
              Começar grátis
            </Link>
            <a className="lp-btn lp-btn-ghost" href="#como-funciona">
              Ver como funciona
            </a>
          </div>
          <div className="lp-trust">Conecte em 1 clique. Sem cartão.</div>
        </div>
      </section>

      <section className="lp-section" id="como-funciona">
        <div className="lp-inner">
          <h2>Como funciona</h2>
          <p className="lead">Três passos e sua recepcionista automática está no ar.</p>
          <div className="lp-steps">
            {steps.map((s) => (
              <div className="lp-step" key={s.n}>
                <div className="lp-step-n">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-metrics">
        <div className="lp-inner">
          {metrics.map((m) => (
            <div className="lp-metric" key={m.label}>
              <strong>{m.value}</strong>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section" id="recursos">
        <div className="lp-inner">
          <h2>Tudo que você precisa</h2>
          <p className="lead">
            Do comentário à DM, com controle total e sem depender de ninguém.
          </p>
          <div className="lp-features">
            {features.map((f) => (
              <div className="lp-feature" key={f.title}>
                <h3>
                  <span className="lp-check">✓</span> {f.title}
                </h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="precos">
        <div className="lp-inner">
          <h2>Preços</h2>
          <p className="lead">
            Valores de exemplo — ajuste os planos como quiser no código.
          </p>
          <div className="lp-pricing-grid">
            {plans.map((p) => (
              <div
                className={`lp-plan ${p.featured ? "featured" : ""}`}
                key={p.name}
              >
                <strong>{p.name}</strong>
                <div className="price">
                  {p.price} <small>{p.per}</small>
                </div>
                <ul>
                  {p.features.map((it) => (
                    <li key={it}>
                      <span className="lp-check">✓</span> {it}
                    </li>
                  ))}
                </ul>
                <Link
                  className={`lp-btn ${p.featured ? "lp-btn-primary" : "lp-btn-ghost"}`}
                  href="/app"
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-inner">
          <h2>Perguntas frequentes</h2>
          <div className="lp-faq-list">
            {faqs.map((f) => (
              <div className="lp-faq-item" key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-inner">
          <h2>Pronto pra parar de responder na mão?</h2>
          <Link className="lp-btn lp-btn-primary" href="/app">
            Começar grátis
          </Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-inner">
          <div className="lp-brand">
            <span className="brand-dot" /> CommentFlow
          </div>
          <span>
            Feito com a API oficial da Meta. Use dentro dos termos. ·{" "}
            <Link href="/privacidade" style={{ color: "var(--muted)" }}>Privacidade</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
