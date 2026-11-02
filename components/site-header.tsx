"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { useCart } from "./cart-context";
import { BrandMark } from "./brand-mark";
import { LanguageMenu } from "./language-menu";

const navLinks = [
  { href: "/boutique", label: "Toute la boutique", match: (p: string, g: string | null) => p === "/boutique" && !g },
  { href: "/boutique?genre=femme", label: "Femme", match: (_: string, g: string | null) => g === "femme" },
  { href: "/boutique?genre=homme", label: "Homme", match: (_: string, g: string | null) => g === "homme" },
  { href: "/boutique?genre=enfants", label: "Enfants", match: (_: string, g: string | null) => g === "enfants" },
  { href: "/categorie/chaussures", label: "Chaussures", match: (p: string) => p === "/categorie/chaussures" },
  { href: "/boutique?tri=nouveautes", label: "Nouveautés", match: () => false },
];

/** `account` : menu compte rendu côté serveur (lit la session) */
export function SiteHeader({ account }: { account?: ReactNode }) {
  const { count } = useCart();
  const ref = useRef<HTMLElement>(null);

  // Hauteur réelle de l'en-tête (variable CSS) : les menus mobiles s'ouvrent juste dessous
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={ref} className="hdr">
      <div className="wrap hdr-top">
        <Link href="/" className="hdr-logo" aria-label="Le Jardin d'Eïden — accueil">
          <BrandMark size={30} />
          <span className="hdr-name">
            Le Jardin <span className="hdr-name-end">d&apos;Eïden</span>
          </span>
        </Link>

        <SearchForm className="hdr-search hdr-search-desktop" />

        <div className="hdr-actions">
          <div className="hdr-lang">
            <LanguageMenu />
          </div>
          {account}
          <Link href="/panier" className="hdr-cart" aria-label={count > 0 ? `Panier : ${count} article(s)` : "Panier"}>
            <span style={{ position: "relative", display: "inline-flex" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" />
                <circle cx="10" cy="20.5" r="1.3" />
                <circle cx="17" cy="20.5" r="1.3" />
              </svg>
              <span className={`hdr-badge${count > 0 ? "" : " is-empty"}`}>{count > 99 ? "99+" : count}</span>
            </span>
            <span className="hdr-cart-label">Panier</span>
          </Link>
        </div>
      </div>

      <div className="wrap hdr-search-mobile-row">
        <SearchForm className="hdr-search" />
      </div>

      <nav className="hdr-nav" aria-label="Rayons">
        <div className="wrap hdr-nav-inner">
          <Suspense fallback={<NavLinks pathname="" genre={null} />}>
            <NavLinksFromUrl />
          </Suspense>
        </div>
      </nav>

      <style>{`
        .hdr { position: sticky; top: 0; z-index: 40; background: var(--ivory); border-bottom: 1px solid var(--line); }
        .hdr-top { display: flex; align-items: center; gap: 1rem; height: 68px; }
        .hdr-logo { display: flex; align-items: center; gap: 0.6rem; color: var(--forest); text-decoration: none; flex-shrink: 0; }
        .hdr-name { font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: var(--forest); line-height: 1; white-space: nowrap; }
        .hdr-search { position: relative; flex: 1; min-width: 0; }
        .hdr-search-desktop { max-width: 560px; margin: 0 auto; }
        .hdr-search .field { padding: 0.6rem 3rem 0.6rem 1rem; border-radius: 9999px; font-size: 0.92rem; }
        .hdr-search button {
          position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 38px; height: 34px; border: none;
          border-radius: 9999px; background: var(--forest); color: var(--ivory); cursor: pointer; display: grid; place-items: center;
        }
        .hdr-search button:hover { background: var(--foliage); }
        .hdr-actions { display: flex; align-items: center; gap: 0.35rem; margin-left: auto; flex-shrink: 0; }
        .hdr-cart {
          display: inline-flex; align-items: center; gap: 6px; padding: 0.35rem 0.55rem; border-radius: 0.6rem;
          border: 1px solid transparent; color: var(--forest); text-decoration: none; font-weight: 600; font-size: 0.9rem;
        }
        .hdr-cart:hover { border-color: var(--line); background: #fff; }
        .hdr-badge {
          position: absolute; top: -6px; right: -8px; min-width: 19px; height: 19px; padding: 0 5px; border-radius: 999px;
          background: var(--brass); color: var(--forest); font-size: 0.7rem; font-weight: 700; display: grid; place-items: center;
          border: 2px solid var(--ivory);
        }
        .hdr-badge.is-empty { background: var(--ivory-deep); color: var(--muted); }
        .hdr-search-mobile-row { display: none; }
        .hdr-nav { background: var(--forest); }
        .hdr-nav-inner { display: flex; gap: 0.25rem; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .hdr-nav-inner::-webkit-scrollbar { display: none; }
        .hdr-nav a {
          flex-shrink: 0; padding: 0.55rem 0.8rem; color: rgba(251,247,239,0.88); text-decoration: none; font-size: 0.88rem; font-weight: 500;
          border-radius: 0.5rem; white-space: nowrap;
        }
        .hdr-nav a:hover { color: #fff; background: rgba(251,247,239,0.1); }
        .hdr-nav a[aria-current="page"] { color: var(--forest); background: var(--ivory); }
        .hdr-nav a:focus-visible { outline: 2px solid var(--brass); outline-offset: -2px; }

        /* Tablette : la recherche passe sous le logo */
        @media (max-width: 900px) {
          .hdr-search-desktop { display: none; }
          .hdr-search-mobile-row { display: block; padding-bottom: 0.6rem; }
          .hdr-top { height: 60px; }
        }
        /* Smartphone : icônes compactes */
        @media (max-width: 720px) {
          .hdr-top { gap: 0.5rem; height: 56px; }
          .hdr-cart-label, .hdr-lang { display: none; }
          .hdr-name { font-size: 1.05rem; }
          .hdr-search .field { font-size: 16px; } /* évite le zoom automatique sur iPhone */
          .hdr-nav a { padding: 0.5rem 0.7rem; font-size: 0.85rem; }
        }
        @media (max-width: 380px) {
          .hdr-name-end { display: none; }
        }
      `}</style>
    </header>
  );
}

function SearchForm({ className }: { className: string }) {
  return (
    <form action="/boutique" method="get" role="search" className={className}>
      <input type="search" name="q" placeholder="Rechercher un produit, une marque…" aria-label="Rechercher un produit" className="field" />
      <button type="submit" aria-label="Lancer la recherche">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}

/** Rayon actif d'après l'adresse (lue à la requête : derrière une frontière Suspense) */
function NavLinksFromUrl() {
  const pathname = usePathname();
  const genre = useSearchParams().get("genre");
  return <NavLinks pathname={pathname} genre={genre} />;
}

function NavLinks({ pathname, genre }: { pathname: string; genre: string | null }) {
  return navLinks.map((l) => (
    <Link key={l.href} href={l.href} aria-current={l.match(pathname, genre) ? "page" : undefined}>
      {l.label}
    </Link>
  ));
}
