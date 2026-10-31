"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * A gaveta à direita (como na Mandei) que a Central de ajuda e as
 * Notificações usam. Esc fecha, clique fora fecha, o foco entra no primeiro
 * campo e fica preso dentro (Tab dá a volta) e, ao fechar, volta para quem
 * abriu. Abaixo de 900 px ocupa a largura toda.
 */
export function Painel({ onFechar, largura, rotulo, cabecalho, rodape, children, corpoStyle }: {
  onFechar: () => void;
  largura: number;
  rotulo: string;
  cabecalho: ReactNode;
  rodape?: ReactNode;
  children: ReactNode;
  corpoStyle?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focaveis = () => Array.from(el?.querySelectorAll<HTMLElement>('input, button, a[href], [tabindex]:not([tabindex="-1"])') ?? []).filter((e) => !e.hasAttribute("disabled"));
    const primeiro = focaveis().find((e) => e.dataset.fechar === undefined) ?? focaveis()[0];
    primeiro?.focus();

    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onFechar(); return; }
      if (e.key !== "Tab") return;
      const f = focaveis();
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener("keydown", h);
    return () => { document.removeEventListener("keydown", h); antes?.focus?.(); };
  }, [onFechar]);

  return (
    <>
      <div className="m-scrim" onClick={onFechar} aria-hidden="true" />
      <aside ref={ref} className="m-painel" role="dialog" aria-modal="true" aria-label={rotulo} style={{ width: largura }}>
        <div className="shrink-0 flex items-start" style={{ gap: 14, padding: "22px 24px 0" }}>
          <div className="flex-1 min-w-0">{cabecalho}</div>
          <button type="button" data-fechar onClick={onFechar} aria-label="Fechar" className="flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0" style={{ width: 32, height: 32, borderRadius: 10, color: "var(--m-text-dim)" }}>
            <X size={18} />
          </button>
        </div>
        <div className="m-painel-corpo" style={corpoStyle}>{children}</div>
        {rodape && <div className="shrink-0" style={{ padding: "0 24px 20px" }}>{rodape}</div>}
      </aside>
    </>
  );
}

/** O quadrado com o gradiente da marca no topo das gavetas. */
export function IconeCabecalho({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center justify-center shrink-0" style={{ width: 46, height: 46, borderRadius: 14, background: "var(--m-grad-brand)", color: "#fff" }}>
      {children}
    </span>
  );
}
