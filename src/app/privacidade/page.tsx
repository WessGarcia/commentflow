import Link from "next/link";

export const metadata = {
  title: "Privacidade e exclusão de dados · CommentFlow",
  description: "Quais dados o CommentFlow guarda, para quê, e como apagá-los.",
};

/**
 * Página pública exigida pela Meta para publicar o app: serve como
 * "URL da Política de Privacidade" e "URL de instruções de exclusão de dados".
 */
export default function PrivacidadePage() {
  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-inner">
          <Link href="/" className="lp-brand" style={{ color: "var(--text)", textDecoration: "none" }}>
            <span className="brand-dot" /> CommentFlow
          </Link>
        </div>
      </nav>

      <main className="lp-inner" style={{ maxWidth: 760, padding: "48px 20px 72px" }}>
        <h1 style={{ fontSize: 34, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Privacidade e exclusão de dados</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 32px" }}>
          O CommentFlow responde comentários e envia mensagens no Instagram em nome do dono desta
          instalação, usando a API oficial da Meta.
        </p>

        <h2 style={{ fontSize: 20, margin: "28px 0 8px" }}>Quais dados guardamos</h2>
        <ul style={{ color: "var(--muted)", paddingLeft: 20, margin: 0 }}>
          <li>Da conta conectada: o ID e o nome de usuário do Instagram e o acesso concedido pela Meta, guardado criptografado.</li>
          <li>Dos comentários recebidos: o ID do comentário e do post, o ID e o nome de usuário de quem comentou e o texto do comentário.</li>
          <li>O registro do que a automação fez (resposta pública, mensagem enviada, botão tocado).</li>
        </ul>

        <h2 style={{ fontSize: 20, margin: "28px 0 8px" }}>Para que usamos</h2>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Só para responder ao comentário e enviar a mensagem que a pessoa pediu, e para mostrar esse
          histórico ao dono da conta no painel. Os dados ficam no banco desta instalação e não são
          vendidos nem compartilhados com terceiros.
        </p>

        <h2 style={{ fontSize: 20, margin: "28px 0 8px" }}>Como apagar seus dados</h2>
        <ul style={{ color: "var(--muted)", paddingLeft: 20, margin: 0 }}>
          <li>
            <b style={{ color: "var(--text)" }}>Dono da conta:</b> no painel, em Configurações, clique em
            “Desconectar”. O acesso ao Instagram é apagado na hora. Você também pode remover o app em
            Facebook → Configurações → Integrações comerciais.
          </li>
          <li>
            <b style={{ color: "var(--text)" }}>Quem comentou ou recebeu mensagem:</b> mande uma mensagem
            direta para o perfil do Instagram que respondeu você pedindo a exclusão. Seus comentários e
            mensagens guardados aqui são apagados em até 30 dias.
          </li>
        </ul>
      </main>

      <footer className="lp-footer">
        <div className="lp-inner">
          <span>CommentFlow</span>
          <Link href="/" style={{ color: "var(--muted)" }}>Voltar ao site</Link>
        </div>
      </footer>
    </div>
  );
}
