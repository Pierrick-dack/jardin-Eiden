"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { submitReview, type ReviewState } from "@/app/(boutique)/produit/[slug]/actions";

export type ReviewViewer = { firstName: string; alreadyReviewed: boolean } | null;

export function ReviewDialog({
  productId,
  productName,
  productSlug,
  viewer,
}: {
  productId: string;
  productName: string;
  productSlug: string;
  /** Client connecté, ou null (compte obligatoire pour publier) */
  viewer: ReviewViewer;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Change à chaque ouverture : remet le formulaire à zéro après un envoi
  const [formKey, setFormKey] = useState(0);

  function open() {
    setFormKey((k) => k + 1);
    dialogRef.current?.showModal();
  }
  const close = useCallback(() => dialogRef.current?.close(), []);

  if (!viewer) {
    return (
      <Link
        href={`/connexion?next=${encodeURIComponent(`/produit/${productSlug}#avis`)}`}
        className="btn btn-outline"
        style={{ width: "100%" }}
      >
        Se connecter pour laisser un avis
      </Link>
    );
  }
  if (viewer.alreadyReviewed) {
    return (
      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--success)" }}>
        ✓ Merci {viewer.firstName}, tu as déjà donné ton avis sur ce produit.
      </p>
    );
  }

  return (
    <>
      <button type="button" className="btn btn-outline" onClick={open} style={{ width: "100%" }}>
        ✎ Laisser un avis
      </button>

      <dialog
        ref={dialogRef}
        className="review-dialog"
        aria-labelledby="review-title"
        // Clic sur le fond assombri = fermeture
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "1rem" }}>
            <div>
              <h2 id="review-title" style={{ fontSize: "1.4rem", color: "var(--forest)" }}>
                Ton avis compte
              </h2>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "var(--muted)" }}>
                {productName}
              </p>
            </div>
            <button type="button" onClick={close} aria-label="Fermer" className="review-close">
              ×
            </button>
          </div>
          <ReviewForm key={formKey} productId={productId} onDone={close} />
        </div>
      </dialog>

      <style>{`
        .review-dialog {
          /* La remise à zéro CSS de Tailwind met margin: 0 partout, ce qui
             colle la fenêtre à gauche : margin auto la recentre */
          margin: auto;
          width: min(520px, calc(100vw - 32px));
          max-height: calc(100dvh - 32px);
          overflow-y: auto;
          padding: 0;
          border: 1px solid var(--line);
          border-radius: 1.1rem;
          background: var(--ivory);
          color: var(--ink);
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        }
        .review-dialog::backdrop { background: rgba(30,58,43,0.45); }
        .review-close {
          border: none;
          background: transparent;
          font-size: 1.6rem;
          line-height: 1;
          cursor: pointer;
          color: var(--muted);
        }
        .star-btn {
          border: none;
          background: transparent;
          padding: 0 2px;
          font-size: 1.9rem;
          line-height: 1;
          cursor: pointer;
        }
        .star-btn:focus-visible { outline: 2px solid var(--brass); border-radius: 4px; }
      `}</style>
    </>
  );
}

function ReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, {});
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  // Ferme automatiquement la fenêtre peu après un envoi réussi
  useEffect(() => {
    if (!state.ok) return;
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [state.ok, onDone]);

  if (state.ok) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0 0.5rem" }}>
        <p style={{ fontSize: "2rem", margin: 0 }}>🌿</p>
        <p style={{ fontWeight: 600, color: "var(--forest)", margin: "0.5rem 0 0.25rem" }}>
          Merci pour ton avis !
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: 0 }}>
          Il est maintenant visible sur la page du produit
          {state.verified ? ", avec le badge « Achat vérifié »." : "."}
        </p>
      </div>
    );
  }

  const shown = hover || rating;
  const labels = ["", "Décevant", "Moyen", "Bien", "Très bien", "Excellent"];

  return (
    <form action={action} style={{ display: "grid", gap: "1rem", marginTop: "1.25rem" }}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating || ""} />
      {/* Champ piège anti-robots, invisible pour les humains */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        style={{ position: "absolute", left: "-9999px" }}
      />

      <div>
        <span id="rating-label" style={{ fontSize: "0.85rem", fontWeight: 500 }}>
          Ta note *
        </span>
        <div
          role="radiogroup"
          aria-labelledby="rating-label"
          style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 4 }}
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} étoile${n > 1 ? "s" : ""} — ${labels[n]}`}
              className="star-btn"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              style={{ color: n <= shown ? "var(--brass)" : "var(--line)" }}
            >
              ★
            </button>
          ))}
          <span style={{ marginLeft: 8, fontSize: "0.85rem", color: "var(--muted)" }}>
            {labels[shown]}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="title">Titre de ton avis *</label>
        <input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={100}
          className="field"
          placeholder="Ex : Ma peau est plus douce"
          style={{ marginTop: 6 }}
        />
      </div>

      <div>
        <label htmlFor="comment">Ton avis *</label>
        <textarea
          id="comment"
          name="comment"
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          className="field"
          placeholder="Qu'as-tu pensé de ce produit ?"
          style={{ marginTop: 6, resize: "vertical" }}
        />
      </div>

      <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>
        Ton avis sera publié sous ton prénom et l&apos;initiale de ton nom. Si tu as acheté ce produit
        chez nous, il portera le badge « Achat vérifié ».
      </p>

      {state.error && (
        <p role="alert" style={{ margin: 0, fontSize: "0.88rem", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={pending || rating === 0}>
        {pending ? "Envoi…" : "Publier mon avis"}
      </button>
    </form>
  );
}
