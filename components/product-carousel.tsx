"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { youtubeEmbedUrl, youtubeId, youtubeThumb } from "@/lib/video";

type Media = {
  url: string;
  alt: string | null;
  kind: "image" | "video";
  poster: string | null;
};

type Props = {
  media: Media[];
  name: string;
  /** Délai entre deux photos en millisecondes (défilement automatique) */
  interval?: number;
};

export function ProductCarousel({ media, name, interval = 5000 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Vidéo YouTube lancée par le client (le lecteur n'est chargé qu'au clic)
  const [ytPlaying, setYtPlaying] = useState<number | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const count = media.length;
  const current = media[index];
  const firstImage = media.findIndex((m) => m.kind === "image");

  // Défilement automatique des photos : le minuteur repart à zéro à chaque
  // changement (y compris un clic) et s'arrête au survol ou au focus.
  // Une vidéo, elle, passe à la suite quand elle se termine (onEnded).
  // Une vidéo YouTube non lancée défile comme une photo ; lancée, elle bloque
  // le défilement jusqu'à ce que le client change de média.
  const holdsSlide = current?.kind === "video" && (!youtubeId(current.url) || ytPlaying === index);
  useEffect(() => {
    if (count < 2 || paused || holdsSlide) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearTimeout(t);
  }, [index, count, paused, interval, holdsSlide]);

  // Lecture de la vidéo visible uniquement ; les autres sont arrêtées
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === index) {
        v.play().catch(() => {
          /* lecture automatique refusée par le navigateur : l'image d'aperçu reste */
        });
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, [index]);

  // Changer de média arrête la vidéo YouTube (le lecteur est démonté)
  const show = (i: number) => {
    setYtPlaying(null);
    setIndex(i);
  };
  const go = (delta: number) => show((index + delta + count) % count);

  return (
    <div
      role="region"
      aria-roledescription="carrousel"
      aria-label={`Photos et vidéos de ${name}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
      style={{
        position: "relative",
        aspectRatio: "1/1",
        borderRadius: "1.1rem",
        overflow: "hidden",
        background: "var(--ivory-deep)",
        border: "1px solid var(--line)",
      }}
    >
      {media.map((m, i) => (
        <div
          key={m.url}
          aria-hidden={i !== index}
          style={{
            position: "absolute",
            inset: 0,
            opacity: i === index ? 1 : 0,
            // Les diapositives sont empilées : seule la visible reçoit les clics
            // (sinon les photos suivantes, transparentes, couvrent le bouton lecture)
            zIndex: i === index ? 1 : 0,
            pointerEvents: i === index ? "auto" : "none",
            transition: "opacity 0.6s ease",
          }}
        >
          {m.kind === "video" && youtubeId(m.url) ? (
            <YouTubeSlide
              id={youtubeId(m.url)!}
              title={m.alt || name}
              playing={ytPlaying === i}
              onPlay={() => setYtPlaying(i)}
              tabbable={i === index}
            />
          ) : m.kind === "video" ? (
            <video
              ref={(el) => {
                videoRefs.current[i] = el;
              }}
              src={m.url}
              poster={m.poster ?? undefined}
              muted
              playsInline
              loop={count === 1}
              // Rien n'est téléchargé tant que la vidéo n'est pas affichée
              preload={i === index ? "auto" : "none"}
              onEnded={() => count > 1 && setIndex((j) => (j + 1) % count)}
              aria-label={`Vidéo : ${m.alt || name}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <Image
              src={m.url}
              alt={m.alt || name}
              fill
              sizes="(max-width: 860px) 100vw, 640px"
              style={{ objectFit: "cover" }}
              // 1re photo = élément principal de la page, les autres attendent
              loading={i === firstImage ? "eager" : "lazy"}
              fetchPriority={i === firstImage ? "high" : "auto"}
            />
          )}
        </div>
      ))}

      {current?.kind === "video" && ytPlaying !== index && (
        <span
          className="chip"
          style={{ position: "absolute", zIndex: 2, top: 12, left: 12, background: "rgba(20,40,30,0.75)", color: "#fff" }}
        >
          ▶ Vidéo
        </span>
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Média précédent"
            className="carousel-btn"
            style={{ left: 12 }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Média suivant"
            className="carousel-btn"
            style={{ right: 12 }}
          >
            ›
          </button>

          <div
            style={{
              position: "absolute",
              zIndex: 2,
              bottom: 14,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
            }}
          >
            {media.map((m, i) => (
              <button
                key={m.url}
                type="button"
                onClick={() => show(i)}
                aria-label={`${m.kind === "video" ? "Vidéo" : "Photo"} ${i + 1} sur ${count}`}
                aria-current={i === index}
                className={m.kind === "video" ? "carousel-dot carousel-dot-video" : "carousel-dot"}
                style={{
                  width: m.kind === "video" ? 18 : i === index ? 22 : 8,
                  background: i === index ? "var(--ivory)" : "rgba(251,247,239,0.55)",
                }}
              >
                {m.kind === "video" && "▶"}
              </button>
            ))}
          </div>
        </>
      )}

      <style>{`
        .carousel-btn {
          position: absolute;
          z-index: 2;
          top: 50%;
          transform: translateY(-50%);
          width: 42px;
          height: 42px;
          border-radius: 9999px;
          border: 1px solid var(--line);
          background: rgba(251,247,239,0.9);
          color: var(--forest);
          font-size: 1.6rem;
          line-height: 1;
          padding-bottom: 3px;
          cursor: pointer;
          display: grid;
          place-items: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          transition: background 0.18s ease;
        }
        .carousel-btn:hover { background: var(--ivory); }
        .carousel-btn:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }
        .carousel-dot {
          height: 8px;
          padding: 0;
          border: none;
          border-radius: 9999px;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
          transition: width 0.25s ease;
        }
        .carousel-dot-video {
          height: 18px;
          font-size: 0.55rem;
          line-height: 18px;
          color: var(--forest);
        }
        .yt-slide { position: absolute; inset: 0; background: #0d1410; overflow: hidden; }
        .yt-backdrop { position: absolute; inset: -20px; width: calc(100% + 40px); height: calc(100% + 40px); object-fit: cover; filter: blur(22px) brightness(0.55); }
        .yt-thumb { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
        .yt-play {
          position: absolute; inset: 0; margin: auto; width: 78px; height: 78px; border-radius: 999px; border: none; cursor: pointer;
          background: rgba(251,247,239,0.95); color: var(--forest); display: grid; place-items: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35); transition: transform 0.18s ease, background 0.18s ease;
        }
        .yt-play:hover { transform: scale(1.07); background: #fff; }
        .yt-play:focus-visible { outline: 3px solid var(--brass); outline-offset: 3px; }
        .yt-play::after { content: ""; position: absolute; inset: -10px; border-radius: 999px; border: 2px solid rgba(251,247,239,0.6); animation: yt-ring 1.8s ease-out infinite; }
        .yt-caption { position: absolute; left: 0; right: 0; bottom: 44px; text-align: center; color: #fff; font-size: 0.85rem; font-weight: 600; text-shadow: 0 1px 6px rgba(0,0,0,0.6); pointer-events: none; }
        .yt-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        @keyframes yt-ring { from { transform: scale(0.9); opacity: 1; } to { transform: scale(1.25); opacity: 0; } }
      `}</style>
    </div>
  );
}

/**
 * Diapositive YouTube : miniature de la vidéo (nette, sur fond flouté) et
 * bouton lecture ; le lecteur YouTube n'est chargé qu'au clic, ce qui garde
 * la page rapide et évite les cookies tant que la vidéo n'est pas lue.
 */
function YouTubeSlide({ id, title, playing, onPlay, tabbable }: { id: string; title: string; playing: boolean; onPlay: () => void; tabbable: boolean }) {
  // Miniature HD, sinon qualité standard (toutes les vidéos n'ont pas la HD)
  const [thumb, setThumb] = useState(youtubeThumb(id));
  if (playing) {
    return (
      <div className="yt-slide">
        <iframe
          className="yt-frame"
          src={youtubeEmbedUrl(id)}
          title={`Vidéo : ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  return (
    <div className="yt-slide">
      {/* eslint-disable-next-line @next/next/no-img-element -- miniature YouTube distante */}
      <img className="yt-backdrop" src={thumb} alt="" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element -- miniature YouTube distante */}
      <img
        className="yt-thumb"
        src={thumb}
        alt={`Aperçu de la vidéo : ${title}`}
        loading="lazy"
        onLoad={(e) => {
          // YouTube renvoie une image grise de 120 px quand la HD n'existe pas
          if (e.currentTarget.naturalWidth <= 120 && thumb.includes("maxres")) setThumb(youtubeThumb(id, "hqdefault"));
        }}
        onError={() => thumb.includes("maxres") && setThumb(youtubeThumb(id, "hqdefault"))}
      />
      <button type="button" className="yt-play" onClick={onPlay} aria-label={`Lire la vidéo : ${title}`} tabIndex={tabbable ? 0 : -1}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ marginLeft: 4 }}>
          <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
        </svg>
      </button>
      <span className="yt-caption">Regarder la vidéo</span>
    </div>
  );
}
