import { BarChart3, Bot, Calendar, Filter, MessageSquare, Sparkles, TrendingUp } from "lucide-react";
import { getInsights } from "@/lib/insights";
import type { Periodo } from "@/lib/painel";
import { BancoFora } from "../_ui/banco-fora";
import { Card, Metrica, PageHeader, Tile } from "../_ui/ui";
import { fmt } from "../_ui/fmt";
import { Economia, FiltroPeriodoInsights, Grafico } from "./grafico";

export const dynamic = "force-dynamic";

const CORES = ["var(--accent)", "var(--m-pink)", "var(--info)", "#10B981", "#CBD2DE"];

/** Os arcos do donut: cada fatia começa onde a anterior terminou. */
function arcosDe<T extends { n: number }>(fatias: T[], total: number, C: number) {
  const saida: (T & { offset: number; len: number; cor: string })[] = [];
  let acc = 0;
  fatias.forEach((f, i) => {
    const frac = total ? f.n / total : 0;
    saida.push({ offset: acc, len: frac * C, cor: CORES[i % CORES.length], ...f });
    acc += frac * C;
  });
  return saida;
}

/** Insights (como na Mandei): o período em números, gráfico, fatias por automação e a economia. */
export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sp = await searchParams;
  const periodo = ([7, 30, 90] as const).includes(Number(sp.periodo) as Periodo) ? (Number(sp.periodo) as Periodo) : 30;
  const d = await getInsights(periodo).catch(() => null);
  if (!d) return <BancoFora />;
  const { atual, anterior } = d.m;
  const sufixo = `vs. ${periodo} dias anteriores`;
  const maxFluxo = Math.max(1, ...d.fluxos.map((f) => f.execucoes));
  const R = 58, C = 2 * Math.PI * R;
  const arcos = arcosDe(d.fatias.slice(0, 5), d.totalExec, C);

  return (
    <div className="rise-in">
      <PageHeader titulo="Insights" sub="O que a automação produziu no período, em números que dá para conferir.">
        <FiltroPeriodoInsights valor={periodo} />
      </PageHeader>

      <div className="grid m-metricas" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 18, marginBottom: 20 }}>
        <Metrica variante="compacta" rotulo="Conversas iniciadas" valor={fmt(atual.conversas)} icone={<MessageSquare size={20} strokeWidth={1.8} />} atual={atual.conversas} anterior={anterior.conversas} sufixo={sufixo} />
        <Metrica variante="compacta" rotulo="Respostas automáticas" valor={fmt(atual.respostas)} icone={<Bot size={20} strokeWidth={1.8} />} tom="verde" atual={atual.respostas} anterior={anterior.respostas} sufixo={sufixo} />
        <Metrica variante="compacta" rotulo="Taxa de resposta" valor={`${atual.conversao}%`} icone={<Filter size={20} strokeWidth={1.8} />} atual={atual.conversao} anterior={anterior.conversao} sufixo={sufixo} sub="respondeu ÷ recebeu o direct" />
      </div>

      <div className="grid items-start m-insights-2" style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 20, marginBottom: 20 }}>
        <Card>
          <div className="flex items-center" style={{ gap: 12 }}>
            <Tile tom="roxo" size={40}><TrendingUp size={19} strokeWidth={1.8} /></Tile>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>Conversas ao longo do tempo</div>
              <div style={{ fontSize: 12.5, color: "var(--m-text-dim)" }}>Directs abertos pela automação, por dia</div>
            </div>
            <span className="ml-auto inline-flex items-center m-so-desktop" style={{ gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--m-text-dim)" }}><Calendar size={14} /> Diário</span>
          </div>
          <div style={{ marginTop: 16 }}>
            <Grafico serie={d.serie} />
          </div>
        </Card>

        <div className="flex flex-col" style={{ gap: 20 }}>
          <Card>
            <div className="flex items-center" style={{ gap: 12 }}>
              <Tile tom="roxo" size={40}><BarChart3 size={19} strokeWidth={1.8} /></Tile>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>Top automações</div>
                <div style={{ fontSize: 12.5, color: "var(--m-text-dim)" }}>Execuções desde o início</div>
              </div>
            </div>
            <div className="flex flex-col" style={{ gap: 14, marginTop: 18 }}>
              {d.fluxos.length === 0 && <span style={{ fontSize: 13, color: "var(--m-text-dim)" }}>Nenhuma execução ainda.</span>}
              {d.fluxos.map((f) => (
                <div key={f.nome} className="flex items-center" style={{ gap: 12 }}>
                  <span className="truncate" style={{ width: 130, fontSize: 13, fontWeight: 600 }}>{f.nome}</span>
                  <div className="flex-1 overflow-hidden" style={{ height: 11, borderRadius: 999, background: "var(--track)" }}>
                    <div style={{ width: `${Math.max(2, (f.execucoes / maxFluxo) * 100)}%`, height: "100%", borderRadius: 999, background: "var(--accent)" }} />
                  </div>
                  <span className="text-right" style={{ width: 46, fontSize: 13, fontWeight: 700 }}>{fmt(f.execucoes)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Economia desde={d.desde} />
        </div>
      </div>

      <div className="grid items-start m-insights-3" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 20 }}>
        <Card>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>Comentários por automação</div>
          <div style={{ fontSize: 12.5, color: "var(--m-text-dim)" }}>Quantos comentários do período cada uma atendeu.</div>
          <div className="flex items-center" style={{ gap: 20, marginTop: 18 }}>
            <svg width={152} height={152} viewBox="0 0 152 152" style={{ transform: "rotate(-90deg)", flex: "0 0 auto" }} aria-hidden="true">
              <circle cx={76} cy={76} r={R} fill="none" stroke="var(--track)" strokeWidth={26} />
              {arcos.map((a) => (
                <circle key={a.nome} cx={76} cy={76} r={R} fill="none" stroke={a.cor} strokeWidth={26} strokeDasharray={`${Math.max(0, a.len - 2.5)} ${C - Math.max(0, a.len - 2.5)}`} strokeDashoffset={-a.offset} />
              ))}
            </svg>
            <div className="flex flex-col min-w-0" style={{ gap: 9 }}>
              {arcos.length === 0 && <span style={{ fontSize: 13, color: "var(--m-text-dim)" }}>Sem dados no período.</span>}
              {arcos.map((a) => (
                <div key={a.nome} className="flex items-center" style={{ gap: 8, fontSize: 13 }}>
                  <span className="rounded-full shrink-0" style={{ width: 11, height: 11, background: a.cor }} />
                  <span className="truncate" style={{ fontWeight: 600 }}>{a.nome}</span>
                  <span className="ml-auto" style={{ color: "var(--m-text-dim)", fontWeight: 700 }}>{a.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--m-text-dim)", marginTop: 12 }}><b style={{ color: "var(--text-primary)", fontSize: 15 }}>{fmt(d.totalExec)}</b> comentários atendidos no período</div>
        </Card>

        <Card>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>Top palavras-chave</div>
          <div className="grid" style={{ gridTemplateColumns: "28px minmax(0,1fr) 90px 60px", gap: 8, marginTop: 14, fontSize: 12.5, fontWeight: 700, color: "var(--m-text-dim)", paddingBottom: 8, borderBottom: "1px solid var(--m-divider)" }}>
            <span>#</span><span>Palavra-chave</span><span className="text-right">Comentários</span><span className="text-right">%</span>
          </div>
          {d.topPalavras.length === 0 && <div style={{ fontSize: 13, color: "var(--m-text-dim)", marginTop: 10 }}>Sem dados no período.</div>}
          {d.topPalavras.map((p, i) => (
            <div key={p.palavra} className="grid items-center" style={{ gridTemplateColumns: "28px minmax(0,1fr) 90px 60px", gap: 8, padding: "10px 0", borderBottom: "1px solid var(--m-divider-soft)", fontSize: 13.5 }}>
              <span style={{ color: "var(--m-text-dim)", fontWeight: 700 }}>{i + 1}</span>
              <span className="truncate" style={{ fontWeight: 700 }}>{p.palavra}</span>
              <span className="text-right" style={{ fontWeight: 700 }}>{fmt(p.n)}</span>
              <span className="text-right" style={{ color: "var(--m-text-dim)" }}>{p.pct}%</span>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>Resumo e insights</div>
          <div className="flex flex-col" style={{ gap: 14, marginTop: 14 }}>
            {d.frases.map((f, i) => (
              <div key={i} className="flex items-start" style={{ gap: 12 }}>
                <Tile tom={f.tom} size={40}>{f.tom === "verde" ? <TrendingUp size={18} /> : f.tom === "ambar" ? <Filter size={18} /> : <Sparkles size={18} />}</Tile>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{f.titulo}</div>
                  <div className="m-pretty" style={{ fontSize: 12.5, color: "var(--m-text-dim)", lineHeight: 1.5, marginTop: 2 }}>{f.corpo}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
