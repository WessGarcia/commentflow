"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Rocket, X } from "lucide-react";
import type { Onboarding } from "@/lib/onboarding";

/** O cartão dos 4 primeiros passos no Início (como na Mandei). "Pular" some com ele de vez. */
export function OnboardingCard({ o }: { o: Onboarding }) {
  const router = useRouter();
  const [sumiu, setSumiu] = useState(false);
  if (sumiu) return null;
  const pular = async () => {
    setSumiu(true);
    await fetch("/api/onboarding", { method: "POST" }).catch(() => {});
    router.refresh();
  };
  const pct = Math.round((o.feitos / o.passos.length) * 100);
  return (
    <div className="relative overflow-hidden" style={{ borderRadius: 18, border: "1.5px solid var(--m-selected-border)", background: "var(--bg-card)", padding: 22 }}>
      <button type="button" onClick={pular} aria-label="pular primeiros passos" title="Pular" className="absolute flex items-center justify-center cursor-pointer border-0 bg-transparent" style={{ top: 12, right: 12, width: 32, height: 32, borderRadius: 9, color: "var(--m-text-faint)" }}><X size={17} /></button>
      <div className="flex items-start" style={{ gap: 14 }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: 14, background: "var(--m-grad-cta)", color: "#fff" }}><Rocket size={22} /></span>
        <div className="flex-1 min-w-0" style={{ paddingRight: 28 }}>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>Vamos colocar seu Instagram no piloto automático</div>
          <div style={{ fontSize: 13.5, color: "var(--m-text-dim)", marginTop: 3 }}>{o.feitos} de {o.passos.length} passos · leva uns 5 minutos</div>
          <div className="overflow-hidden" style={{ height: 6, borderRadius: 99, background: "var(--track)", marginTop: 10, maxWidth: 360 }}><div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 99, transition: "width .3s" }} /></div>
        </div>
      </div>
      <div className="grid m-onb-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 18 }}>
        {o.passos.map((p, i) => {
          const atual = o.proximo?.id === p.id;
          return (
            <div key={p.id} className="flex flex-col" style={{ border: `1.5px solid ${atual ? "var(--accent)" : p.feito ? "var(--m-ok-border)" : "var(--m-row-border)"}`, background: p.feito ? "var(--m-ok-bg)" : atual ? "var(--m-surface)" : "var(--bg-card)", borderRadius: 14, padding: 14, opacity: !p.feito && !atual ? 0.7 : 1 }}>
              <div className="flex items-center" style={{ gap: 9 }}>
                <span className="flex items-center justify-center shrink-0 rounded-full" style={{ width: 26, height: 26, background: p.feito ? "var(--success)" : atual ? "var(--accent)" : "var(--m-divider-soft)", color: p.feito || atual ? "#fff" : "var(--m-text-dim)", fontSize: 12.5, fontWeight: 800 }}>{p.feito ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                <span style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.25 }}>{p.titulo}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--m-text-dim)", lineHeight: 1.45, marginTop: 8, flex: 1 }}>{p.texto}</div>
              {atual && <Link href={p.href} className="m-btn" style={{ marginTop: 12, height: 38, fontSize: 13 }}>{p.acao} <ArrowRight size={14} /></Link>}
              {!atual && !p.feito && <Link href={p.href} style={{ marginTop: 12, fontSize: 12.5, fontWeight: 700, color: "var(--accent)" }}>{p.acao}</Link>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
