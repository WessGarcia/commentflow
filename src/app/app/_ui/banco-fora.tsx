import { Card } from "./ui";

/** Quando o banco não responde: diz o que fazer, em vez de quebrar a tela. */
export function BancoFora() {
  return (
    <Card style={{ marginTop: 24 }}>
      <h2 className="m-h2">O banco de dados não respondeu</h2>
      <p className="m-sub">
        Ligue o banco e recarregue a página. Com Docker: abra o Docker Desktop e rode <code>docker compose up -d</code> na
        pasta do CommentFlow. Na Render, o banco volta sozinho em alguns minutos. Para saber o que falta:{" "}
        <code>node scripts/setup.mjs verificar</code>.
      </p>
    </Card>
  );
}
