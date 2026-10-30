import type { Metadata } from "next";
import { Caveat, Plus_Jakarta_Sans } from "next/font/google";
import "./painel.css";
import { PainelShell } from "./shell";

// As fontes do painel antigo da Mandei: Plus Jakarta Sans no texto e Caveat no banner.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"], display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["500"], display: "swap" });

export const metadata: Metadata = {
  title: "CommentFlow · Painel",
  description: "Automação de comentários e direct do Instagram.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <PainelShell fontes={`${jakarta.variable} ${caveat.variable}`}>{children}</PainelShell>;
}
