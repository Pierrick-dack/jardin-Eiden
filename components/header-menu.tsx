"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Menu déroulant de l'en-tête (style Amazon) :
 * - ordinateur : s'ouvre au survol (petit délai à la fermeture pour laisser
 *   le temps d'atteindre le panneau) et au clavier ;
 * - mobile / tactile : s'ouvre au toucher, panneau pleine largeur.
 * Se ferme avec Échap, au clic extérieur et au choix d'un lien.
 */
export function HeaderMenu({
  trigger,
  label,
  children,
  align = "right",
  width = 560,
}: {
  trigger: ReactNode;
  /** Nom accessible du bouton */
  label: string;
  children: ReactNode;
  align?: "left" | "right";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const enter = () => {
    if (!canHover()) return;
    cancelClose();
    setOpen(true);
  };
  const leave = () => {
    if (!canHover()) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => cancelClose, []);

  return (
    <div ref={rootRef} className="hm" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        className={`hm-trigger${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
        <svg className="hm-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="hm-backdrop" aria-hidden onClick={() => setOpen(false)} />}
      <div
        id={id}
        className={`hm-panel hm-${align}${open ? " is-open" : ""}`}
        style={{ width }}
        hidden={!open}
        // Un lien choisi dans le menu : on ferme (la page change)
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
      >
        <span className="hm-arrow" aria-hidden />
        {children}
      </div>

      <style>{`
        .hm { position: relative; }
        .hm-trigger {
          display: inline-flex; align-items: center; gap: 6px; padding: 0.35rem 0.55rem; border-radius: 0.6rem;
          border: 1px solid transparent; background: none; color: var(--ink); font: inherit; cursor: pointer; text-align: left; line-height: 1.15;
        }
        .hm-trigger:hover, .hm-trigger.is-open { border-color: var(--line); background: #fff; }
        .hm-trigger:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }
        .hm-caret { color: var(--muted); transition: transform 0.15s ease; flex-shrink: 0; }
        .hm-trigger.is-open .hm-caret { transform: rotate(180deg); }
        .hm-panel {
          position: absolute; top: calc(100% + 10px); z-index: 70; max-width: calc(100vw - 24px);
          background: #fff; color: var(--ink); border: 1px solid var(--line); border-radius: 1rem;
          box-shadow: 0 22px 60px rgba(20,40,30,0.22);
        }
        .hm-panel.is-open { animation: hm-pop 0.16s ease; }
        .hm-right { right: 0; }
        .hm-left { left: 0; }
        .hm-arrow { position: absolute; top: -7px; width: 12px; height: 12px; background: #fff; border-left: 1px solid var(--line); border-top: 1px solid var(--line); transform: rotate(45deg); }
        .hm-right .hm-arrow { right: 28px; }
        .hm-left .hm-arrow { left: 28px; }
        /* Pont invisible : la souris passe du bouton au panneau sans le fermer */
        .hm-panel::before { content: ""; position: absolute; left: 0; right: 0; top: -12px; height: 12px; }
        .hm-backdrop { display: none; }
        @keyframes hm-pop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

        @media (max-width: 720px) {
          /* Mobile : feuille pleine largeur sous l'en-tête, fond assombri */
          .hm-panel {
            position: fixed; left: 8px !important; right: 8px !important; top: var(--header-h, 120px);
            width: auto !important; max-width: none; max-height: calc(100dvh - var(--header-h, 120px) - 12px); overflow-y: auto;
          }
          .hm-arrow { display: none; }
          .hm-backdrop { display: block; position: fixed; inset: var(--header-h, 120px) 0 0 0; background: rgba(20,40,30,0.35); z-index: 60; }
        }
      `}</style>
    </div>
  );
}
