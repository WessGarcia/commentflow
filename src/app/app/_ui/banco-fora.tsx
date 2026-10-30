import { Card } from "./ui";

/** Quando o banco não responde: diz o que fazer, em vez de quebrar a tela. */
export function BancoFora() {
  return (
    <Card style={{ marginTop: 24 }}>
      <h2 className="m-h2">O banco de dados não respondeu</h2>
      <p className="m-sub">
        Ligue o banco e recarregue a página. No computador: <code>bash C:/tmp/commentflow-db.sh ligar</code>. No Docker:{" "}
        <code>docker compose up</code>.
      </p>
    </Card>
  );
}
