"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Banner = {
  image: string;
  eyebrow: string;
  title: string;
  text: string;
  cta: { label: string; href: string };
};

/** Grandes affiches défilantes de l'accueil (fondu toutes les `interval` ms) */
export function HeroBanners({ banners, interval = 6000 }: { banners: Banner[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearTimeout(t);
  }, [index, count, paused, interval]);

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <section
      className="hero-banners"
      aria-roledescription="carrousel"
      aria-label="À la une"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {banners.map((b, i) => (
        <div key={b.image} className="hero-slide" aria-hidden={i !== index} style={{ opacity: i === index ? 1 : 0 }}>
          <Image
            src={b.image}
            alt=""
            fill
            sizes="100vw"
            style={{ objectFit: "cover" }}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
          />
          <div className="hero-overlay" />
          <div className="wrap hero-content">
            <p className="hero-eyebrow">{b.eyebrow}</p>
            <h2 className="hero-title">{b.title}</h2>
            <p className="hero-text">{b.text}</p>
            <Link href={b.cta.href} className="btn btn-brass" tabIndex={i === index ? 0 : -1}>
              {b.cta.label} →
            </Link>
          </div>
        </div>
      ))}

      {count > 1 && (
        <>
          <button type="button" className="hero-arrow" style={{ left: 16 }} onClick={() => go(-1)} aria-label="Affiche précédente">
            ‹
          </button>
          <button type="button" className="hero-arrow" style={{ right: 16 }} onClick={() => go(1)} aria-label="Affiche suivante">
            ›
          </button>
          <div className="hero-dots">
            {banners.map((b, i) => (
              <button
                key={b.image}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Affiche ${i + 1} sur ${count}`}
                aria-current={i === index}
                style={{ width: i === index ? 26 : 9, background: i === index ? "var(--brass)" : "rgba(255,255,255,0.6)" }}
              />
            ))}
          </div>
        </>
      )}

      <style>{`
        .hero-banners {
          position: relative;
          height: clamp(380px, 52vw, 540px);
          overflow: hidden;
          background: var(--forest);
        }
        .hero-slide { position: absolute; inset: 0; transition: opacity 0.8s ease; }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(20,40,30,0.88) 0%, rgba(20,40,30,0.55) 45%, rgba(20,40,30,0.05) 100%);
        }
        .hero-content {
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          color: #fff;
        }
        /* Laisse la place aux flèches (prioritaire sur la marge de .wrap) */
        .hero-banners .hero-content {
          padding-left: max(4.5rem, var(--gutter)) !important;
          padding-right: max(4.5rem, var(--gutter)) !important;
        }
        .hero-eyebrow {
          margin: 0 0 0.75rem;
          color: var(--brass);
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 0.82rem;
        }
        .hero-title {
          color: #fff;
          font-size: clamp(2rem, 5vw, 3.6rem);
          max-width: 16ch;
          margin-bottom: 1rem;
        }
        .hero-text { max-width: 44ch; font-size: 1.08rem; line-height: 1.6; margin: 0 0 1.75rem; opacity: 0.92; }
        .hero-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.4);
          background: rgba(20,40,30,0.35);
          color: #fff;
          font-size: 1.7rem;
          line-height: 1;
          padding-bottom: 4px;
          cursor: pointer;
          display: grid;
          place-items: center;
        }
        .hero-arrow:hover { background: rgba(20,40,30,0.6); }
        .hero-dots {
          position: absolute;
          bottom: 18px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        .hero-dots button {
          height: 9px;
          border: none;
          border-radius: 9999px;
          padding: 0;
          cursor: pointer;
          transition: width 0.25s ease;
        }
        @media (max-width: 640px) {
          .hero-banners .hero-content { padding-left: var(--gutter) !important; padding-right: var(--gutter) !important; }
          .hero-arrow { display: none; }
        }
      `}</style>
    </section>
  );
}
