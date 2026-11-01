import Link from "next/link";
import { Activity, ArrowRight, GitBranch, Instagram, MessageCircle, MoreHorizontal, Plus, Send, Settings, Users, Zap } from "lucide-react";
import { getInicio, type Periodo } from "@/lib/painel";
import { Avatar, Card, LinkSeta, Metrica, Pill, Tile, Vazio } from "./_ui/ui";
import { fmt } from "./_ui/fmt";
import { BancoFora } from "./_ui/banco-fora";
import { ComentariosRecentes, DicaInicio, FiltroPeriodo } from "./inicio-parts";
import { estadoOnboarding } from "@/lib/onboarding";
import { OnboardingCard } from "./onboarding-card";

export const dynamic = "force-dynamic";

/**
 * Início (design do painel antigo da Mandei, 19/09): banner, quatro números do
 * período, comentários recentes, automações, a conta, o uso e a dica. Números
 * reais do banco; o delta compara com o período anterior de mesmo tamanho.
 */
export default async function Inicio({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sp = await searchParams;
  const periodo = ([7, 30, 90] as const).includes(Number(sp.periodo) as Periodo) ? (Number(sp.periodo) as Periodo) : 7;
  const [d, onb] = await Promise.all([getInicio(periodo), estadoOnboarding()]).catch(() => [null, null] as const);
  if (!d || !onb) return <BancoFora />;

  const { atual, anterior } = d.metricas;
  const sufixo = `vs. últimos ${periodo} dias`;
  const conectada = Boolean(d.conta);
  const ok = conectada && d.automacaoLigada;

  return (
    <div className="flex flex-col rise-in" style={{ gap: 20, paddingTop: 8 }}>
      {!onb.concluido && !onb.dispensado && <OnboardingCard o={onb} />}
      <div className="relative overflow-hidden flex items-center m-inicio-banner" style={{ borderRadius: 18, padding: "34px 38px", background: "var(--m-grad-hero)", color: "#fff", gap: 28 }}>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".14em", color: "rgba(255,255,255,.72)" }}>AUTOMAÇÃO NO INSTAGRAM</div>
          <div style={{ fontSize: 31, fontWeight: 800, letterSpacing: "-.025em", marginTop: 10 }}>Conecte. Converta. Cresça com o CommentFlow.</div>
          <div className="m-pretty" style={{ fontSize: 15, color: "rgba(255,255,255,.86)", lineHeight: 1.55, marginTop: 8, maxWidth: 520 }}>
            Transforme comentários em conversas e vendas, com automações feitas para o Instagram.
          </div>
          {conectada ? (
            <Link href={d.fluxos.length ? "/app/fluxos" : "/app/fluxos?modelos=1"} className="inline-flex items-center" style={{ marginTop: 20, gap: 9, borderRadius: 12, padding: "13px 20px", background: "#fff", color: "#6D28D9", fontSize: 14.5, fontWeight: 700, boxShadow: "var(--m-shadow-hero-btn)" }}>
              {d.fluxos.length ? "Ver minhas automações" : "Criar minha primeira automação"} <ArrowRight size={17} />
            </Link>
          ) : (
            <a href="/api/auth/meta/login" className="inline-flex items-center" style={{ marginTop: 20, gap: 9, borderRadius: 12, padding: "13px 20px", background: "#fff", color: "#6D28D9", fontSize: 14.5, fontWeight: 700, boxShadow: "var(--m-shadow-hero-btn)" }}>
              Conectar meu Instagram <ArrowRight size={17} />
            </a>
          )}
        </div>
        <div className="flex items-center shrink-0 m-inicio-banner-arte" style={{ gap: 22 }}>
          <Instagram size={96} strokeWidth={1.2} style={{ color: "rgba(255,255,255,.95)" }} />
          <div className="flex flex-col" style={{ fontFamily: "var(--font-hand)", fontSize: 25, lineHeight: 1.4, color: "rgba(255,255,255,.95)", fontWeight: 500 }}>
            <span>Mais conversas</span>
            <span>Mais vendas</span>
            <span>Sem mensalidade</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap" style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: ok ? "var(--success)" : "var(--danger)", animation: ok ? "pulseDot 1.6s ease-in-out infinite" : "none" }} />
          {ok ? "Automação respondendo" : !conectada ? "Instagram não conectado" : "Nenhuma automação ativa"}
        </div>
        <FiltroPeriodo valor={periodo} />
      </div>

      <div className="grid m-inicio-metricas m-metricas" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 18 }}>
        <Metrica rotulo="Comentários recebidos" valor={fmt(atual.comentarios)} icone={<MessageCircle size={20} strokeWidth={1.8} />} atual={atual.comentarios} anterior={anterior.comentarios} sufixo={sufixo} />
        <Metrica rotulo="Respostas automáticas" valor={fmt(atual.respostas)} icone={<Zap size={20} strokeWidth={1.8} />} atual={atual.respostas} anterior={anterior.respostas} sufixo={sufixo} />
        <Metrica rotulo="Directs enviados" valor={fmt(atual.dms)} icone={<Send size={20} strokeWidth={1.8} />} atual={atual.dms} anterior={anterior.dms} sufixo={sufixo} />
        <Metrica rotulo="Novos contatos" valor={fmt(atual.novos)} icone={<Users size={20} strokeWidth={1.8} />} atual={atual.novos} anterior={anterior.novos} sufixo={sufixo} />
      </div>

      <div className="grid items-start m-inicio-colunas" style={{ gridTemplateColumns: "minmax(0,1.05fr) minmax(0,1.05fr) minmax(0,.85fr)", gap: 20 }}>
        <Card>
          <div className="flex items-center gap-2.5">
            <h2 className="m-h2">Comentários recentes</h2>
            <LinkSeta href="/app/comentarios">Ver todos</LinkSeta>
          </div>
          <ComentariosRecentes itens={d.recentes} />
        </Card>

        <Card>
          <div className="flex items-center gap-2.5">
            <h2 className="m-h2">Automações</h2>
            <LinkSeta href="/app/fluxos">Ver todas</LinkSeta>
          </div>
          <div className="flex flex-col" style={{ gap: 10, marginTop: 14 }}>
            {d.fluxos.length === 0 && <Vazio>Nenhuma automação ainda. Crie a primeira: uma palavra-chave e a mensagem que ela entrega.</Vazio>}
            {d.fluxos.slice(0, 5).map((f) => (
              <Link key={f.id} href={`/app/fluxos?editar=${f.id}`} className="m-row flex items-center" style={{ gap: 13, border: "1px solid var(--m-row-border)", borderRadius: 13, padding: "13px 14px", color: "inherit" }}>
                <Tile tom="roxo" size={40}><GitBranch size={19} strokeWidth={1.8} /></Tile>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center" style={{ gap: 9 }}>
                    <span className="truncate" style={{ fontSize: 14, fontWeight: 700 }}>{f.nome}</span>
                    <Pill tom={f.ativo ? "verde" : "ambar"} dot>{f.ativo ? "Ativo" : "Pausado"}</Pill>
                  </div>
                  <div className="truncate" style={{ fontSize: 12.5, color: "var(--m-text-dim)", marginTop: 3 }}>{f.descricao}</div>
                </div>
                <div className="flex items-center shrink-0" style={{ gap: 6, fontSize: 12.5, color: "var(--m-text-dim)" }}>
                  <Activity size={15} style={{ color: "var(--m-text-placeholder)" }} />
                  <span style={{ fontWeight: 700, color: "var(--m-neutral-text)" }}>{fmt(f.execucoes)}</span> execuções
                </div>
                <MoreHorizontal size={18} style={{ color: "var(--m-text-placeholder)" }} />
              </Link>
            ))}
            <Link href="/app/fluxos?modelos=1" className="flex items-center justify-center" style={{ gap: 8, border: "1px dashed var(--m-dashed)", background: "var(--m-dashed-bg)", borderRadius: 13, padding: 14, fontSize: 13.5, fontWeight: 700, color: "var(--text-muted)" }}>
              <Plus size={17} style={{ color: "var(--accent)" }} /> Nova automação
            </Link>
          </div>
        </Card>

        <div className="flex flex-col" style={{ gap: 20 }}>
          <Card>
            <div className="flex items-center gap-2.5">
              <Tile tom="ig" size={26} radius={8}><Instagram size={15} /></Tile>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>Seu Instagram</span>
              <span className="ml-auto"><Pill tom={conectada ? "verde" : "vermelho"} dot>{conectada ? "Conectado" : "Desconectado"}</Pill></span>
            </div>
            <div className="flex items-center" style={{ gap: 12, marginTop: 16 }}>
              {d.conta ? (
                <Avatar nome={d.conta.username} size={46} />
              ) : (
                <span className="rounded-full flex items-center justify-center shrink-0" style={{ width: 46, height: 46, background: "var(--m-neutral-bg)", color: "var(--m-text-dim)" }}><Instagram size={20} /></span>
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontSize: 14, fontWeight: 700 }}>{d.conta ? `@${d.conta.username}` : "Nenhuma conta"}</div>
                <div style={{ fontSize: 12.5, color: "var(--m-text-dim)", marginTop: 2 }}>{d.conta ? "conta profissional" : "conecte pelo Instagram, sem copiar código"}</div>
              </div>
              <Link href="/app/configuracoes" aria-label="configurações do Instagram" className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--m-text-dim)" }}>
                <Settings size={17} strokeWidth={1.8} />
              </Link>
            </div>
          </Card>

          <Card>
            <div className="flex items-center"><span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>Seu uso</span><span className="ml-auto"><Pill tom="roxo">Sem limites</Pill></span></div>
            <div className="flex flex-col" style={{ gap: 15, marginTop: 16 }}>
              <Uso rotulo="Contatos" valor={d.uso.contatos} />
              <Uso rotulo="Directs este mês" valor={d.uso.dmsMes} />
              <Uso rotulo="Automações" valor={d.uso.automacoes} />
            </div>
            <div style={{ fontSize: 12, color: "var(--m-text-faint)", marginTop: 14, lineHeight: 1.5 }}>O CommentFlow não cobra por contato: quanto mais gente comentar, melhor.</div>
          </Card>

          <DicaInicio />
        </div>
      </div>
    </div>
  );
}

function Uso({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
      <span style={{ color: "var(--m-neutral-text)", fontWeight: 600 }}>{rotulo}</span>
      <span style={{ color: "var(--success-text)", fontWeight: 700 }}>{fmt(valor)} · ilimitado</span>
    </div>
  );
}
