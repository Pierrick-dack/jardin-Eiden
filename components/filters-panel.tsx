"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Panneau de filtres de la boutique :
 * - ordinateur : colonne latérale fixe à gauche de la grille ;
 * - mobile / tablette : tiroir qui glisse depuis la gauche, ouvert par le
 *   bouton « Filtres ». Il reste ouvert pendant qu'on combine les filtres
 *   (le compteur se met à jour) et se ferme avec « Voir les produits ».
 */
export function FiltersPanel({
  count,
  activeCount,
  toolbar,
  children,
  results,
}: {
  count: number;
  activeCount: number;
  /** Recherche et tri, à droite du bouton « Filtres » */
  toolbar: ReactNode;
  /** Contenu des filtres */
  children: ReactNode;
  /** Filtres actifs + grille de produits */
  results: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    // Pas de défilement de la page derrière le tiroir
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const openButton = (
      <button type="button" className="fp-open" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="filters-panel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filtres
        {activeCount > 0 && <span className="fp-count">{activeCount}</span>}
      </button>
  );

  return (
    <div className="fp-layout">
      {open && <div className="fp-backdrop" onClick={() => setOpen(false)} aria-hidden />}

      <aside id="filters-panel" className={`fp${open ? " is-open" : ""}`} aria-label="Filtres">
        <div className="fp-head">
          <strong>Filtres</strong>
          <button type="button" className="fp-close" onClick={() => setOpen(false)} aria-label="Fermer les filtres">
            ×
          </button>
        </div>
        <div className="fp-body">{children}</div>
        <div className="fp-foot">
          <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setOpen(false)}>
            Voir {count} produit{count > 1 ? "s" : ""}
          </button>
        </div>
      </aside>

      <div className="fp-main">
        <div className="fp-toolbar">
          {openButton}
          {toolbar}
        </div>
        {results}
      </div>

      <style>{`
        .fp-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 2rem; align-items: start; }
        .fp-main { min-width: 0; }
        .fp-toolbar { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem; }
        .fp-open {
          display: none; align-items: center; gap: 0.45rem; padding: 0.6rem 1rem; border-radius: 999px;
          border: 1px solid var(--line); background: #fff; color: var(--forest); font: inherit; font-weight: 600; font-size: 0.9rem; cursor: pointer;
        }
        .fp-count { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--forest); color: var(--ivory); font-size: 0.72rem; display: grid; place-items: center; }
        .fp { position: sticky; top: calc(var(--header-h, 110px) + 16px); align-self: start; max-height: calc(100dvh - var(--header-h, 110px) - 32px); overflow-y: auto; }
        .fp-head, .fp-foot, .fp-backdrop { display: none; }

        @media (max-width: 960px) {
          .fp-layout { grid-template-columns: minmax(0, 1fr); gap: 0; }
          .fp-open { display: inline-flex; }
          .fp {
            position: fixed; top: 0; bottom: 0; left: 0; z-index: 80; width: min(340px, 88vw); max-height: none;
            display: flex; flex-direction: column; background: var(--ivory); box-shadow: 12px 0 40px rgba(20,40,30,0.25);
            transform: translateX(-105%); transition: transform 0.25s ease; visibility: hidden;
          }
          .fp.is-open { transform: none; visibility: visible; }
          .fp-head { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.15rem; border-bottom: 1px solid var(--line); background: #fff; }
          .fp-head strong { font-size: 1.15rem; color: var(--forest); font-family: var(--font-display); }
          .fp-close { border: none; background: none; font-size: 1.8rem; line-height: 1; color: var(--muted); cursor: pointer; }
          .fp-body { flex: 1; overflow-y: auto; padding: 1rem 1.15rem; }
          .fp-foot { display: block; padding: 0.85rem 1.15rem; border-top: 1px solid var(--line); background: #fff; }
          .fp-backdrop { display: block; position: fixed; inset: 0; z-index: 79; background: rgba(20,40,30,0.45); animation: fp-fade 0.2s ease; }
        }
        @media (prefers-reduced-motion: reduce) { .fp { transition: none; } }
        @keyframes fp-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
