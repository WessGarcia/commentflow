"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ExternalLink, Eye, EyeOff, Instagram, KeyRound, Loader2, Lock, PlugZap, Rocket, Send, ShieldCheck, Webhook, Wifi } from "lucide-react";
import { Card, Pill } from "../_ui/ui";
import { Copiar } from "../configuracoes/conexao";

/**
 * O assistente "Ligar a Meta": as etapas do docs/GUIA.md com os endereços
 * do próprio usuário, botões de copiar e o status de cada etapa lido do
 * servidor (/api/saude). O que só existe no site da Meta, a pessoa clica lá;
 * o resto (chaves, endereço, teste) se faz aqui mesmo, sem terminal.
 */

export type Estado = {
  banco: boolean;
  meta: { appId: boolean; appSecret: boolean; verifyToken: boolean; enderecoPublico: string | null };
  webhook: { verificadoEm: string | null; ultimoAvisoEm: string | null };
  instagram: { conectado: boolean; conta: string | null };
  automacoes: number;
};

type Etapa = { id: string; titulo: string; feito: boolean | null; icone: React.ReactNode; corpo: React.ReactNode };

export function Assistente({ estado, origem, token, faltaApp }: { estado: Estado; origem: string; token: string; faltaApp: boolean }) {
  const router = useRouter();
  const base = estado.meta.enderecoPublico;
  const localhost = /localhost|127\.0\.0\.1/.test(origem);
  const [endereco, setEndereco] = useState(base ?? (origem.startsWith("https://") ? origem : ""));
  const [appId, setAppId] = useState("");
  const [segredo, setSegredo] = useState("");
  const [verToken, setVerToken] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ etapa: string; ok: boolean; texto: string } | null>(null);

  async function salvar(etapa: string, corpo: Record<string, string>) {
    setOcupado(etapa);
    setAviso(null);
    const r = await fetch("/api/config-meta", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
    const j = await r.json().catch(() => ({}));
    setOcupado(null);
    if (!r.ok) return setAviso({ etapa, ok: false, texto: j.error ?? "Não deu para salvar." });
    setAviso({ etapa, ok: true, texto: "Salvo. Já está valendo." });
    if (etapa === "chaves") { setAppId(""); setSegredo(""); }
    router.refresh();
  }
  async function testar() {
    setOcupado("teste");
    setAviso(null);
    const j = await fetch("/api/config-meta", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ ok: false, erro: "Sem resposta do painel." }));
    setOcupado(null);
    setAviso({ etapa: "endereco", ok: j.ok, texto: j.ok ? "Funcionou: a Meta vai conseguir falar com o seu CommentFlow." : j.erro });
  }

  const Aviso = ({ etapa }: { etapa: string }) =>
    aviso?.etapa === etapa ? <div role={aviso.ok ? "status" : "alert"} style={{ marginTop: 10, padding: "9px 12px", borderRadius: 10, fontSize: 12.5, background: aviso.ok ? "var(--m-success-bg)" : "var(--m-danger-bg)", color: aviso.ok ? "var(--success-text)" : "var(--danger-text)" }}>{aviso.texto}</div> : null;
  const Valor = ({ rotulo, texto }: { rotulo: string; texto: string }) => (
    <div style={{ marginTop: 10 }}>
      <div className="m-label" style={{ marginBottom: 4 }}>{rotulo}</div>
      <Copiar texto={texto} />
    </div>
  );
  const semEndereco = <div className="m-hint" style={{ marginTop: 8 }}>Os valores aparecem aqui depois da etapa “Endereço público”.</div>;

  const etapas: Etapa[] = [
    {
      id: "instagram", titulo: "Deixe o Instagram pronto", feito: null, icone: <Instagram size={17} />,
      corpo: (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "var(--m-text-body)" }}>
          <li>Conta <b>profissional</b> (Empresa ou Criador de conteúdo) e <b>pública</b>.</li>
          <li>No app do Instagram: Configurações → Mensagens → Ferramentas conectadas → <b>Permitir acesso às mensagens</b>.</li>
        </ul>
      ),
    },
    {
      id: "endereco", titulo: "Endereço público (https)", feito: Boolean(base), icone: <Wifi size={17} />,
      corpo: (
        <>
          <div style={{ fontSize: 13, color: "var(--m-text-body)", lineHeight: 1.55, marginTop: 6 }}>
            É por ele que a Meta avisa o CommentFlow de cada comentário. No computador, use um túnel; para ficar no ar 24 h, a Render (veja o DEPLOY.md).
          </div>
          {localhost && !base && (
            <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.55, padding: "10px 12px", borderRadius: 10, background: "var(--m-neutral-bg)" }}>
              Túnel grátis: instale o <a href="https://developers.cloudflare.com/cloudflared/downloads/" target="_blank" rel="noreferrer">cloudflared</a> e rode <code>cloudflared tunnel --url http://localhost:3000</code>. Ele mostra um endereço <code>https://…trycloudflare.com</code>: cole abaixo.
            </div>
          )}
          <div className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 10 }}>
            <input className="m-input" style={{ flex: "1 1 260px" }} value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="https://seu-endereco.trycloudflare.com" aria-label="endereço público" />
            <button type="button" className="m-btn" disabled={!endereco.trim() || ocupado === "endereco"} onClick={() => salvar("endereco", { endereco: endereco.trim() })}>{ocupado === "endereco" ? <Loader2 size={15} className="animate-spin" /> : null} Salvar</button>
            {base && <button type="button" className="m-btn-2" disabled={ocupado === "teste"} onClick={testar}>{ocupado === "teste" ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />} Testar</button>}
          </div>
          {origem.startsWith("https://") && base && origem !== base && <div className="m-hint">Você está abrindo o painel por {origem}, mas o endereço salvo é {base}. <button type="button" onClick={() => salvar("endereco", { endereco: origem })} className="border-0 bg-transparent cursor-pointer p-0" style={{ color: "var(--accent)", fontWeight: 700, font: "inherit" }}>Usar {origem}</button></div>}
          <Aviso etapa="endereco" />
        </>
      ),
    },
    {
      id: "app", titulo: "Crie o app na Meta", feito: estado.meta.appId, icone: <Rocket size={17} />,
      corpo: (
        <div style={{ fontSize: 13, color: "var(--m-text-body)", lineHeight: 1.6, marginTop: 6 }}>
          Entre em <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">developers.facebook.com/apps <ExternalLink size={11} /></a> → <b>Criar app</b> → caso de uso <b>Gerenciar mensagens e conteúdo no Instagram</b>. As próximas etapas ficam em <b>Casos de uso → API do Instagram → Configuração da API com login do Instagram</b>.
        </div>
      ),
    },
    {
      id: "basico", titulo: "Configurações básicas do app", feito: null, icone: <ShieldCheck size={17} />,
      corpo: base ? (
        <>
          <div style={{ fontSize: 13, color: "var(--m-text-body)", marginTop: 6 }}>Em <b>Configurações do app → Básico</b>, cole (e escolha uma categoria e um ícone):</div>
          <Valor rotulo="Domínios do app" texto={new URL(base).host} />
          <Valor rotulo="URL da Política de Privacidade" texto={`${base}/privacidade`} />
          <Valor rotulo="URL de exclusão de dados" texto={`${base}/privacidade`} />
        </>
      ) : semEndereco,
    },
    {
      id: "chaves", titulo: "Cole o ID e a chave secreta do app", feito: estado.meta.appId && estado.meta.appSecret, icone: <KeyRound size={17} />,
      corpo: (
        <>
          <div style={{ fontSize: 13, color: "var(--m-text-body)", marginTop: 6 }}>Em <b>Configuração da API com login do Instagram</b>, no topo: copie o <b>ID do app do Instagram</b> e a <b>Chave secreta do app do Instagram</b> (clique em Mostrar). Não é o ID de Configurações → Básico. Ficam guardadas criptografadas e nunca voltam para esta tela.</div>
          <div className="flex flex-col" style={{ gap: 8, marginTop: 10 }}>
            <input className="m-input" value={appId} onChange={(e) => setAppId(e.target.value)} placeholder={estado.meta.appId ? "ID já salvo (cole para trocar)" : "ID do app do Instagram (só números)"} aria-label="ID do app do Instagram" inputMode="numeric" />
            <input className="m-input" value={segredo} onChange={(e) => setSegredo(e.target.value)} placeholder={estado.meta.appSecret ? "Chave já salva (cole para trocar)" : "Chave secreta (32 letras e números)"} aria-label="chave secreta do app" type="password" autoComplete="off" />
            <button type="button" className="m-btn" style={{ alignSelf: "flex-start" }} disabled={(!appId.trim() && !segredo.trim()) || ocupado === "chaves"} onClick={() => salvar("chaves", { ...(appId.trim() ? { appId: appId.trim() } : {}), ...(segredo.trim() ? { appSecret: segredo.trim() } : {}) })}>
              {ocupado === "chaves" ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />} Salvar as chaves
            </button>
          </div>
          <Aviso etapa="chaves" />
        </>
      ),
    },
    {
      id: "login", titulo: "Libere o retorno do login", feito: null, icone: <ArrowRight size={17} />,
      corpo: base ? (
        <>
          <div style={{ fontSize: 13, color: "var(--m-text-body)", marginTop: 6 }}>Na mesma tela, em <b>Configurar o login da empresa no Instagram</b> → <i>URL de redirecionamento OAuth</i>, cole e salve:</div>
          <Valor rotulo="URI de redirecionamento" texto={`${base}/api/auth/meta/callback`} />
        </>
      ) : semEndereco,
    },
    {
      id: "webhook", titulo: "Ligue os avisos (webhook)", feito: Boolean(estado.webhook.verificadoEm), icone: <Webhook size={17} />,
      corpo: base ? (
        <>
          <div style={{ fontSize: 13, color: "var(--m-text-body)", marginTop: 6 }}>Na mesma tela, em <b>Configurar webhooks</b>, cole os dois valores e clique em <b>Verificar e salvar</b>. Depois ligue os campos <code>comments</code>, <code>messages</code> e <code>messaging_postbacks</code> (e, se for usar, <code>live_comments</code> e <code>message_reactions</code>).</div>
          <Valor rotulo="URL de retorno de chamada" texto={`${base}/api/webhooks/instagram`} />
          <div style={{ marginTop: 10 }}>
            <div className="m-label flex items-center" style={{ marginBottom: 4, display: "flex", gap: 6 }}>
              Token de verificação
              <button type="button" onClick={() => setVerToken((v) => !v)} className="border-0 bg-transparent cursor-pointer p-0 flex" aria-label={verToken ? "esconder token" : "mostrar token"} style={{ color: "var(--m-text-dim)" }}>{verToken ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
            {verToken ? <Copiar texto={token} /> : <div className="m-hint" style={{ margin: 0 }}>Clique no olho para ver e copiar.</div>}
          </div>
          {estado.webhook.verificadoEm && <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--success-text)", fontWeight: 600 }}>✓ A Meta verificou o webhook em {new Date(estado.webhook.verificadoEm).toLocaleString("pt-BR")}.</div>}
        </>
      ) : semEndereco,
    },
    {
      id: "publicar", titulo: "Publique o app (modo Ao vivo)", feito: null, icone: <Send size={17} />,
      corpo: (
        <div style={{ fontSize: 13, color: "var(--m-text-body)", lineHeight: 1.6, marginTop: 6 }}>
          No topo do painel do app, mude <b>Modo do app</b> para <b>Ao vivo</b> (ou menu <b>Publicar</b>). A Meta só manda os avisos com o app publicado. Para usar na sua própria conta, <b>não precisa de Análise do app</b>: você é o administrador.
        </div>
      ),
    },
    {
      id: "conectar", titulo: "Conecte o Instagram", feito: estado.instagram.conectado, icone: <Instagram size={17} />,
      corpo: (
        <>
          <div style={{ fontSize: 13, color: "var(--m-text-body)", lineHeight: 1.6, marginTop: 6 }}>
            {estado.instagram.conectado ? <>Conectado: <b>@{estado.instagram.conta}</b>.</> : <>Entre com o Instagram da conta profissional e aceite <b>todas</b> as permissões.</>}
          </div>
          {!estado.instagram.conectado && (
            base && localhost
              ? <a className="m-btn" style={{ marginTop: 10 }} href={`${base}/app/ligar-meta`}>Abrir o painel pelo endereço público para conectar <ExternalLink size={14} /></a>
              : <a className="m-btn" style={{ marginTop: 10 }} href="/api/auth/meta/login"><Instagram size={16} /> Conectar Instagram</a>
          )}
          {!estado.instagram.conectado && base && localhost && <div className="m-hint">O login precisa começar e terminar no mesmo endereço: por isso abre pelo endereço público.</div>}
        </>
      ),
    },
    {
      id: "testar", titulo: "Teste de verdade", feito: Boolean(estado.webhook.ultimoAvisoEm) && estado.automacoes > 0, icone: <Check size={17} />,
      corpo: (
        <div style={{ fontSize: 13, color: "var(--m-text-body)", lineHeight: 1.6, marginTop: 6 }}>
          {estado.automacoes === 0 ? <>Crie a primeira automação em <Link href="/app/fluxos?modelos=1">Automações → Nova automação</Link>. </> : null}
          Com <b>outra conta</b>, comente a palavra-chave num post seu. Em segundos chega a resposta e o direct, e o comentário aparece em <Link href="/app/comentarios">Comentários</Link>.
          {estado.webhook.ultimoAvisoEm && <div style={{ marginTop: 8, color: "var(--success-text)", fontWeight: 600 }}>✓ Último aviso da Meta: {new Date(estado.webhook.ultimoAvisoEm).toLocaleString("pt-BR")}.</div>}
        </div>
      ),
    },
  ];

  const verificaveis = etapas.filter((e) => e.feito !== null);
  const feitas = verificaveis.filter((e) => e.feito).length;
  const proxima = etapas.find((e) => e.feito === false)?.id;

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {faltaApp && <div role="status" className="m-card" style={{ padding: "12px 16px", borderColor: "var(--warning)", color: "var(--warning-text)", fontSize: 13.5, fontWeight: 600 }}>Para conectar o Instagram, primeiro ligue o app da Meta: siga as etapas abaixo.</div>}
      <Card pad={18}>
        <div className="flex items-center flex-wrap" style={{ gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{feitas} de {verificaveis.length} etapas conferidas</span>
          <div className="flex-1 overflow-hidden" style={{ minWidth: 160, height: 8, borderRadius: 99, background: "var(--track)" }}><div style={{ width: `${Math.round((feitas / verificaveis.length) * 100)}%`, height: "100%", background: "var(--accent)", borderRadius: 99 }} /></div>
          <a href="https://github.com/gabrieltabarkiewicz/commentflow/blob/main/docs/GUIA.md" target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700 }}>Guia completo <ExternalLink size={11} /></a>
        </div>
      </Card>
      {etapas.map((e, i) => (
        <Card key={e.id} pad={18} style={{ borderColor: e.id === proxima ? "var(--accent)" : undefined, boxShadow: e.id === proxima ? "0 0 0 4px var(--accent-dim)" : undefined }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: "50%", background: e.feito ? "var(--success)" : e.id === proxima ? "var(--accent)" : "var(--m-neutral-bg)", color: e.feito || e.id === proxima ? "#fff" : "var(--m-text-dim)", fontSize: 13, fontWeight: 800 }}>{e.feito ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
            <span className="flex" style={{ color: "var(--accent)" }}>{e.icone}</span>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.01em" }}>{e.titulo}</span>
            <span className="ml-auto">{e.feito === null ? <Pill tom="cinza">você confere</Pill> : e.feito ? <Pill tom="verde" dot>Pronto</Pill> : e.id === proxima ? <Pill tom="roxo" dot>Próximo passo</Pill> : <Pill tom="ambar" dot>Falta</Pill>}</span>
          </div>
          <div style={{ paddingLeft: 40 }}>{e.corpo}</div>
        </Card>
      ))}
    </div>
  );
}
