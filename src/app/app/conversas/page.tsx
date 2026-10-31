import { Conversas } from "./conversas";

export const dynamic = "force-dynamic";

/** Conversas: a caixa de entrada do direct. ?contato=id abre uma conversa. */
export default async function ConversasPage({ searchParams }: { searchParams: Promise<{ contato?: string }> }) {
  const { contato } = await searchParams;
  return <Conversas inicial={contato} />;
}
