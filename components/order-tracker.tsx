"use client";

import { useEffect, useRef, useState } from "react";
import type { TrackingView } from "@/lib/order-tracking";
import { formatPrice } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" });

/** Frise de suivi : barre de progression animée + étapes détaillées */
export function OrderTracker({ tracking }: { tracking: TrackingView }) {
  const current = tracking.steps.find((s) => s.state === "current");
  const last = [...tracking.steps].reverse().find((s) => s.state === "done");
  const [open, setOpen] = useState<string | null>(current?.key ?? last?.key ?? null);
  // La barre se remplit à l'ouverture (animation)
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setFill(tracking.cancelled ? 0 : tracking.progress));
    return () => cancelAnimationFrame(t);
  }, [tracking.progress, tracking.cancelled]);

  const headline = tracking.cancelled
    ? "Commande annulée"
    : tracking.steps.at(-1)?.state === "done"
      ? "Commande livrée 🎉"
      : current
        ? `Étape en cours : ${current.label}`
        : "";

  return (
    <div className="tracker">
      <div className="tracker-head">
        <div>
          <p className="tracker-ref">Commande {tracking.reference}</p>
          <p className="tracker-headline">{headline}</p>
        </div>
        <span className="tracker-total">{formatPrice(tracking.total)}</span>
      </div>

      {tracking.cancelled ? (
        <div role="status" className="tracker-cancelled">
          Cette commande a été annulée{tracking.refunded ? " et sera remboursée" : ""}. Pour toute question, réponds à l&apos;email reçu.
        </div>
      ) : (
        <div className="tracker-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={tracking.progress} aria-label="Avancement de la livraison">
          <div className="tracker-bar-fill" style={{ width: `${fill}%` }} />
          <span className="tracker-bar-label">{tracking.progress} %</span>
        </div>
      )}

      <ol className="tracker-steps">
        {tracking.steps.map((step, i) => {
          const expanded = open === step.key;
          return (
            <li key={step.key} className={`tracker-step is-${tracking.cancelled && step.state !== "done" ? "upcoming" : step.state}`} style={{ animationDelay: `${i * 70}ms` }}>
              <button type="button" className="tracker-step-btn" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : step.key)}>
                <span className="tracker-dot" aria-hidden>
                  {step.state === "done" ? "✓" : step.icon}
                </span>
                <span className="tracker-step-main">
                  <span className="tracker-step-label">
                    {step.label}
                    {step.state === "current" && !tracking.cancelled && <span className="tracker-badge">En cours</span>}
                  </span>
                  <span className="tracker-step-date">
                    {step.date && step.state === "done" ? dateFmt.format(new Date(step.date)) : step.state === "current" && !tracking.cancelled ? "Bientôt" : "À venir"}
                  </span>
                </span>
                <span className="tracker-chevron" aria-hidden>
                  {expanded ? "−" : "+"}
                </span>
              </button>
              {expanded && <p className="tracker-desc">{step.description}</p>}
            </li>
          );
        })}
      </ol>

      <details className="tracker-items">
        <summary>
          {tracking.items.reduce((n, it) => n + it.quantity, 0)} article(s) · livraison à {tracking.deliveryCity}
        </summary>
        <ul>
          {tracking.items.map((it, i) => (
            <li key={i}>
              <span>
                {it.quantity} × {it.name}
              </span>
              <span>{formatPrice(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <p style={{ margin: "0.5rem 0 0", color: "var(--muted)", fontSize: "0.82rem" }}>📍 {tracking.deliveryAddress}, {tracking.deliveryCity}</p>
      </details>

      <style>{`
        .tracker { display: grid; gap: 1.1rem; }
        .tracker-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        .tracker-ref { margin: 0; font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .tracker-headline { margin: 0.2rem 0 0; font-family: var(--font-display); font-size: 1.35rem; color: var(--forest); }
        .tracker-total { font-weight: 700; color: var(--forest); white-space: nowrap; }
        .tracker-cancelled { padding: 0.8rem 1rem; border-radius: 0.8rem; background: #fbeae8; color: var(--danger); font-size: 0.9rem; }
        .tracker-bar { position: relative; height: 12px; border-radius: 999px; background: var(--ivory-deep); overflow: hidden; }
        .tracker-bar-fill {
          height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, #2f7d4f, var(--brass));
          transition: width 1.1s cubic-bezier(.2,.8,.2,1);
        }
        .tracker-bar-label { position: absolute; right: 8px; top: -1px; font-size: 0.65rem; font-weight: 700; color: var(--forest); line-height: 14px; }
        .tracker-steps { list-style: none; margin: 0; padding: 0; position: relative; }
        .tracker-step { position: relative; padding-left: 0; animation: tracker-in 0.4s ease both; }
        .tracker-step:not(:last-child)::before {
          content: ""; position: absolute; left: 19px; top: 44px; bottom: -4px; width: 2px; background: var(--line);
        }
        .tracker-step.is-done:not(:last-child)::before { background: #2f7d4f; }
        .tracker-step-btn {
          width: 100%; display: flex; align-items: center; gap: 0.85rem; text-align: left;
          border: none; background: none; padding: 0.45rem 0.25rem; border-radius: 0.7rem; cursor: pointer; font: inherit; color: inherit;
        }
        .tracker-step-btn:hover { background: var(--ivory-deep); }
        .tracker-step-btn:focus-visible { outline: 2px solid var(--brass); }
        .tracker-dot {
          width: 40px; height: 40px; flex-shrink: 0; border-radius: 999px; display: grid; place-items: center;
          font-size: 1.05rem; background: var(--ivory-deep); border: 2px solid var(--line); position: relative; z-index: 1;
        }
        .is-done .tracker-dot { background: #2f7d4f; border-color: #2f7d4f; color: #fff; font-weight: 700; }
        .is-current .tracker-dot { background: #fff; border-color: var(--brass); box-shadow: 0 0 0 0 rgba(201,162,75,0.55); animation: tracker-pulse 1.8s ease-out infinite; }
        .is-upcoming .tracker-dot { opacity: 0.55; filter: grayscale(1); }
        .tracker-step-main { flex: 1; display: grid; gap: 0.1rem; }
        .tracker-step-label { font-weight: 600; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .is-upcoming .tracker-step-label { color: var(--muted); font-weight: 500; }
        .tracker-step-date { font-size: 0.8rem; color: var(--muted); }
        .tracker-badge { font-size: 0.68rem; font-weight: 700; padding: 0.12rem 0.5rem; border-radius: 999px; background: #fdf6e3; color: var(--brass-deep); border: 1px solid #e8d4a0; }
        .tracker-chevron { color: var(--muted); font-size: 1.1rem; width: 18px; text-align: center; }
        .tracker-desc { margin: 0 0 0.6rem 3.35rem; font-size: 0.88rem; color: var(--ink); line-height: 1.55; animation: tracker-in 0.25s ease both; }
        .tracker-items { border-top: 1px solid var(--line); padding-top: 0.8rem; font-size: 0.88rem; }
        .tracker-items summary { cursor: pointer; color: var(--foliage); font-weight: 500; }
        .tracker-items ul { list-style: none; margin: 0.6rem 0 0; padding: 0; display: grid; gap: 0.3rem; }
        .tracker-items li { display: flex; justify-content: space-between; gap: 1rem; }
        @keyframes tracker-pulse { 0% { box-shadow: 0 0 0 0 rgba(201,162,75,0.55); } 70% { box-shadow: 0 0 0 12px rgba(201,162,75,0); } 100% { box-shadow: 0 0 0 0 rgba(201,162,75,0); } }
        @keyframes tracker-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}

/** Bouton « Suivre » : ouvre le suivi dans une fenêtre (ouverte d'office si autoOpen) */
export function TrackOrderButton({ tracking, autoOpen = false }: { tracking: TrackingView; autoOpen?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  // Contenu monté seulement quand la fenêtre est ouverte (l'animation se rejoue)
  const [mounted, setMounted] = useState(autoOpen);
  const open = () => {
    setMounted(true);
    ref.current?.showModal();
  };
  // Ouverture d'office (lien de notification / email) : on ne fait qu'afficher la fenêtre
  useEffect(() => {
    if (autoOpen && !ref.current?.open) ref.current?.showModal();
  }, [autoOpen]);

  return (
    <>
      <button type="button" className="btn btn-outline track-btn" onClick={open}>
        📍 Suivre
      </button>
      <dialog ref={ref} className="track-dialog" aria-label={`Suivi de la commande ${tracking.reference}`} onClick={(e) => e.target === e.currentTarget && ref.current?.close()} onClose={() => setMounted(false)}>
        <div style={{ padding: "1.4rem" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", margin: "-0.5rem -0.5rem 0 0" }}>
            <button type="button" aria-label="Fermer" onClick={() => ref.current?.close()} style={{ border: "none", background: "none", fontSize: "1.6rem", cursor: "pointer", color: "var(--muted)", lineHeight: 1 }}>
              ×
            </button>
          </div>
          {/* Monté à l'ouverture : l'animation de la barre se rejoue à chaque fois */}
          {mounted && <OrderTracker tracking={tracking} />}
        </div>
      </dialog>
      <style>{`
        .track-btn { padding: 0.35rem 0.85rem; font-size: 0.82rem; white-space: nowrap; }
        .track-dialog {
          margin: auto; width: min(560px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); overflow-y: auto;
          padding: 0; border: 1px solid var(--line); border-radius: 1.2rem; background: #fff; color: var(--ink);
          box-shadow: 0 24px 70px rgba(0,0,0,0.28);
        }
        .track-dialog[open] { animation: track-pop 0.22s ease; }
        .track-dialog::backdrop { background: rgba(30,58,43,0.5); backdrop-filter: blur(2px); }
        @keyframes track-pop { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
      `}</style>
    </>
  );
}
