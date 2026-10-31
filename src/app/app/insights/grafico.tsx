"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronDown, PiggyBank } from "lucide-react";
import { Card, Tile } from "../_ui/ui";

/**
 * O gráfico de linha dos Insights, em SVG próprio (a série é uma só, e um SVG
 * pequeno não pesa nada). Passe o mouse para ver o dia; o último ponto com
 * valor fica destacado.
 */
export function Grafico({ serie }: { serie: { dia: string; rotulo: string; n: number }[] }) {
  const W = 720, H = 260, L = 44, R = 16, T = 18, B = 34;
  const max = Math.max(4, ...serie.map((s) => s.n));
  const teto = Math.ceil(max / 4) * 4;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, serie.length - 1);
  const y = (n: number) => T + (H - T - B) * (1 - n / teto);
  const pts = serie.map((s, i) => [x(i), y(s.n)] as const);
  const linha = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `M${pts[0][0]},${y(0)} L${linha.replace(/ /g, " L")} L${pts[pts.length - 1][0]},${y(0)} Z`;
  const ultimoComValor = (() => { for (let i = serie.length - 1; i >= 0; i--) if (serie[i].n > 0) return i; return serie.length - 1; })();
  const [hover, setHover] = useState<number | null>(null);
  const sel = hover ?? ultimoComValor;
  const passoX = Math.max(1, Math.round(serie.length / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} onMouseLeave={() => setHover(null)} role="img" aria-label="Directs abertos pela automação, por dia">
      <defs>
        <linearGradient id="areaRoxa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((k) => {
        const v = (teto / 4) * k;
        return (
          <g key={k}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={k === 0 ? "var(--border-strong)" : "var(--track)"} strokeWidth={1} />
            <text x={L - 10} y={y(v) + 4} textAnchor="end" style={{ fontSize: 12, fontWeight: 600, fill: "var(--m-text-faint)" }}>{v}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#areaRoxa)" />
      <polyline points={linha} fill="none" stroke="var(--accent)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {serie.map((s, i) => (i % passoX === 0 ? serie.length - 1 - i >= passoX / 2 || i === serie.length - 1 : i === serie.length - 1) && (
        <text key={s.dia} x={x(i)} y={H - 10} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 600, fill: "var(--m-text-faint)" }}>{s.rotulo}</text>
      ))}
      {serie.map((s, i) => (
        <rect key={`h${s.dia}`} x={x(i) - (W - L - R) / Math.max(1, serie.length) / 2} y={T} width={(W - L - R) / Math.max(1, serie.length)} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />
      ))}
      {serie[sel] && (
        <g>
          <line x1={x(sel)} x2={x(sel)} y1={T} y2={y(0)} stroke="var(--accent)" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
          <circle cx={x(sel)} cy={y(serie[sel].n)} r={5.5} fill="var(--accent)" stroke="#fff" strokeWidth={2.5} />
          {(() => {
            const bw = 150, bh = 46;
            const bx = Math.min(W - R - bw, Math.max(L, x(sel) - bw / 2));
            const by = Math.max(2, y(serie[sel].n) - bh - 14);
            return (
              <g>
                <rect x={bx} y={by} width={bw} height={bh} rx={10} fill="#fff" stroke="var(--border)" />
                <text x={bx + 12} y={by + 18} style={{ fontSize: 11.5, fontWeight: 600, fill: "var(--m-text-dim)" }}>{new Date(serie[sel].dia + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}</text>
                <circle cx={bx + 16} cy={by + 34} r={4} fill="var(--accent)" />
                <text x={bx + 26} y={by + 38} style={{ fontSize: 12.5, fontWeight: 800, fill: "var(--text-primary)" }}>{serie[sel].n} conversa{serie[sel].n === 1 ? "" : "s"}</text>
              </g>
            );
          })()}
        </g>
      )}
    </svg>
  );
}

export function FiltroPeriodoInsights({ valor }: { valor: number }) {
  const router = useRouter();
  return (
    <label className="relative inline-flex items-center cursor-pointer" style={{ gap: 9, background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: "11px 14px", fontSize: 13.5, fontWeight: 600, boxShadow: "var(--shadow-card)" }}>
      <Calendar size={17} style={{ color: "var(--accent)" }} strokeWidth={1.8} />
      <select value={valor} onChange={(e) => router.push(`/app/insights?periodo=${e.target.value}`)} className="appearance-none bg-transparent border-0 cursor-pointer" style={{ fontSize: 13.5, fontWeight: 600, outline: "none", paddingRight: 20 }} aria-label="período">
        <option value={7}>Últimos 7 dias</option>
        <option value={30}>Últimos 30 dias</option>
        <option value={90}>Últimos 90 dias</option>
      </select>
      <ChevronDown size={16} className="absolute pointer-events-none" style={{ right: 12, color: "var(--m-text-dim)" }} />
    </label>
  );
}

const CHAVE = "commentflow.economia.mensal";
const real = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/**
 * Quanto você deixou de pagar. Não usa tabela de preço de outra ferramenta:
 * você diz quanto pagava por mês e a conta corre desde a primeira automação.
 * O valor fica só neste navegador.
 */
export function Economia({ desde }: { desde: string | null }) {
  const [mensal, setMensal] = useState("");
  useEffect(() => {
    try { setMensal(localStorage.getItem(CHAVE) ?? ""); } catch {}
  }, []);
  const mudar = (v: string) => {
    const limpo = v.replace(/[^\d]/g, "").slice(0, 6);
    setMensal(limpo);
    try { localStorage.setItem(CHAVE, limpo); } catch {}
  };

  const valor = Number(mensal) || 0;
  const meses = desde ? Math.max(1, Math.ceil((Date.now() - Date.parse(desde)) / (30.44 * 86_400_000))) : 0;

  return (
    <Card>
      <div className="flex items-center" style={{ gap: 12 }}>
        <Tile tom="verde" size={40}><PiggyBank size={19} strokeWidth={1.8} /></Tile>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>Sua economia</div>
          <div style={{ fontSize: 12.5, color: "var(--m-text-dim)" }}>Comparado com a ferramenta que você pagava todo mês</div>
        </div>
      </div>
      <label className="block" style={{ marginTop: 16 }}>
        <span className="m-label">Quanto você pagava por mês</span>
        <span className="flex items-center" style={{ gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--m-text-dim)" }}>R$</span>
          <input inputMode="numeric" className="m-input" value={mensal} onChange={(e) => mudar(e.target.value)} placeholder="ex.: 150" aria-label="valor mensal em reais" style={{ maxWidth: 160 }} />
        </span>
      </label>
      {valor > 0 && meses > 0 ? (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: "var(--m-success-bg)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--success-text)" }}>Economizado em {meses} {meses === 1 ? "mês" : "meses"}</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.03em", color: "var(--success-text)", marginTop: 2 }}>{real(valor * meses)}</div>
          <div style={{ fontSize: 12.5, color: "var(--m-text-body)", marginTop: 4 }}>Em 12 meses, {real(valor * 12)} que ficam com você.</div>
        </div>
      ) : (
        <div className="m-hint" style={{ marginTop: 12 }}>{meses ? "Digite o valor para ver quanto já economizou." : "A conta começa quando você cria a primeira automação."}</div>
      )}
      <div className="m-hint" style={{ marginTop: 10 }}>Ferramentas que cobram por contato sobem de faixa conforme a sua base cresce. Aqui o custo não muda com o número de contatos.</div>
    </Card>
  );
}
