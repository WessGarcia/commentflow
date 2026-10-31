import type { Metadata } from "next";
// Fontes servidas pelo próprio app (Fontsource, OFL): o build não depende de
// baixar nada do Google, então funciona em qualquer Docker.
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/caveat/500.css";
import "./painel.css";
import { senhaDoPainel } from "@/lib/sessao";
import { PainelShell } from "./shell";


export const metadata: Metadata = {
  title: "CommentFlow · Painel",
  description: "Automação de comentários e direct do Instagram.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <PainelShell fontes="" comSenha={Boolean(senhaDoPainel())}>{children}</PainelShell>;
}
