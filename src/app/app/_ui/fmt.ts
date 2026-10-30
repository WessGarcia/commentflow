/**
 * Formatação do painel, sem "use client": estas funções rodam no servidor
 * (paginas) e no navegador (ui.tsx). Se morassem em ui.tsx, que e client,
 * o React se recusa a chama-las de um Server Component.
 */
export const fmt = (n: number) => n.toLocaleString("pt-BR");
export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

/** Pastel deterministico pelo nome: a mesma pessoa tem sempre a mesma cor. */
const PASTEIS: [string, string][] = [
  ["#FCE3EC", "#B23A6B"], ["#DDE8FB", "#33578F"], ["#E6E0FB", "#5B3FB0"], ["#DCF1EA", "#20775F"],
  ["#FDE8DC", "#A85B2B"], ["#DCE9F7", "#2F5F8C"], ["#F6E1F3", "#8C3C82"], ["#E2E6EF", "#485570"],
  ["#FBE4E4", "#A6423F"], ["#E4EDDD", "#4A7030"], ["#FDEBD2", "#96631C"], ["#DEE9E4", "#38665A"],
];
export function corDe(nome: string): [string, string] {
  let h = 0;
  for (const ch of nome) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PASTEIS[h % PASTEIS.length];
}
export function iniciais(nome: string): string {
  const p = nome.replace(/^@/, "").split(/[\s._-]+/).filter(Boolean);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

/** Datas: "Hoje às 10:24", "Ontem às 16:42", "12 de mar. de 2024". */
export function quando(t: string | null | undefined, comHora = true): string {
  if (!t) return "";
  const d = new Date(t.includes("T") ? t : t.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  const tz = "America/Sao_Paulo";
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: tz });
  const ontem = new Date(Date.now() - 86_400_000).toLocaleDateString("pt-BR", { timeZone: tz });
  const dia = d.toLocaleDateString("pt-BR", { timeZone: tz });
  const hora = d.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  if (dia === hoje) return comHora ? `Hoje às ${hora}` : "Hoje";
  if (dia === ontem) return comHora ? `Ontem às ${hora}` : "Ontem";
  return d.toLocaleDateString("pt-BR", { timeZone: tz, day: "numeric", month: "short", year: "numeric" });
}
/** Curto, para listas: "10:24", "Ontem", "Seg", "12/03". */
export function quandoCurto(t: string | null | undefined): string {
  if (!t) return "";
  const d = new Date(t.includes("T") ? t : t.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  const tz = "America/Sao_Paulo";
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: tz });
  const ontem = new Date(Date.now() - 86_400_000).toLocaleDateString("pt-BR", { timeZone: tz });
  const dia = d.toLocaleDateString("pt-BR", { timeZone: tz });
  if (dia === hoje) return d.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  if (dia === ontem) return "Ontem";
  if (Date.now() - d.getTime() < 6 * 86_400_000) {
    const s = d.toLocaleDateString("pt-BR", { timeZone: tz, weekday: "short" }).replace(".", "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return d.toLocaleDateString("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit" });
}

/** Relativo, para o sino: "agora", "há 12 min", "há 1 h", "ontem, 14:32", "2 dias atrás", depois a data. */
export function quandoRelativo(t: string | null | undefined): string {
  if (!t) return "";
  const d = new Date(t.includes("T") ? t : t.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  const tz = "America/Sao_Paulo";
  const seg = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (seg < 60) return "agora";
  if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: tz });
  const ontem = new Date(Date.now() - 86_400_000).toLocaleDateString("pt-BR", { timeZone: tz });
  const dia = d.toLocaleDateString("pt-BR", { timeZone: tz });
  const hora = d.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  if (dia === hoje) return `há ${Math.floor(seg / 3600)} h`;
  if (dia === ontem) return `ontem, ${hora}`;
  const dias = Math.floor(seg / 86_400);
  if (dias < 7) return `${dias} dias atrás`;
  return d.toLocaleDateString("pt-BR", { timeZone: tz, day: "numeric", month: "short" });
}
/** "Hoje", "Esta semana" ou "Antes": os grupos do sino. */
export function grupoDe(t: string): "Hoje" | "Esta semana" | "Antes" {
  const d = new Date(t.includes("T") ? t : t.replace(" ", "T") + "Z");
  const tz = "America/Sao_Paulo";
  if (d.toLocaleDateString("pt-BR", { timeZone: tz }) === new Date().toLocaleDateString("pt-BR", { timeZone: tz })) return "Hoje";
  return Date.now() - d.getTime() < 7 * 86_400_000 ? "Esta semana" : "Antes";
}
