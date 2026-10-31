import type { Metadata } from "next";
import "@fontsource-variable/playfair-display/wght.css";
import "@fontsource-variable/playfair-display/wght-italic.css";
import "@fontsource-variable/dm-sans";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./flow.css";

/**
 * Link do vídeo de instalação. Aceita link do YouTube, do Vimeo, um link de
 * incorporação (Panda Video, etc.) ou um arquivo .mp4. Vazio = "vídeo em breve".
 */
const VIDEO_URL = "";

const GUIA = "https://github.com/gabrieltabarkiewicz/commentflow/blob/main/docs/GUIA.md";

export const metadata: Metadata = {
  title: "Instalação do CommentFlow",
  description: "Assista ao passo a passo e deixe seu CommentFlow respondendo comentários no Instagram.",
  robots: { index: false, follow: false },
};

/** Transforma o link colado no endereço que o player aceita. */
function embedDe(url: string): { tipo: "iframe" | "video"; src: string } | null {
  const u = url.trim();
  if (!u) return null;
  if (/\.(mp4|webm)(\?|$)/i.test(u)) return { tipo: "video", src: u };
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { tipo: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { tipo: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  return { tipo: "iframe", src: u };
}

export default function FlowPage() {
  const video = embedDe(VIDEO_URL);

  return (
    <div className="flow">
      <header className="flow-top">
        <span className="flow-logo">
          <span className="flow-logo-dot" aria-hidden="true" /> CommentFlow
        </span>
        <span className="flow-tag">Instalação</span>
      </header>

      <main className="flow-main">
        <p className="flow-eyebrow">Passo a passo em vídeo</p>
        <h1 className="flow-h1">
          Seu CommentFlow no ar, <em>do zero ao primeiro direct.</em>
        </h1>
        <p className="flow-sub">
          Assista e vá fazendo junto, pausando quando precisar. No fim do vídeo, seu Instagram
          responde comentários e manda direct sozinho.
        </p>

        <div className="flow-video">
          {video?.tipo === "iframe" && (
            <iframe
              src={video.src}
              title="Instalação do CommentFlow"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
          {video?.tipo === "video" && <video src={video.src} controls playsInline preload="metadata" />}
          {!video && (
            <div className="flow-video-vazio">
              <span className="flow-play" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
              </span>
              <span>O vídeo chega aqui em breve.</span>
            </div>
          )}
        </div>

        <p className="flow-ler">
          Prefere ler? <a href={GUIA} target="_blank" rel="noreferrer">Abra o passo a passo escrito</a>
        </p>
      </main>
    </div>
  );
}
