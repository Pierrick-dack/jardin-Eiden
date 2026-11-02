"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { markReviewHelpful, reportReview } from "@/app/(boutique)/produit/[slug]/actions";
import { ReviewDialog, type ReviewViewer } from "./review-dialog";

export type ReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  isVerified: boolean;
  helpfulCount: number;
  date: string;
  timestamp: number;
};

const PAGE = 4;
const HELPFUL_KEY = "jde-reviews-helpful";
const REPORT_KEY = "jde-reviews-reported";

// Mémorise dans le navigateur les avis déjà votés / signalés
const STORE_EVENT = "jde-reviews-store";

function readRaw(key: string) {
  try {
    return localStorage.getItem(key) || "[]";
  } catch {
    return "[]";
  }
}
function addId(key: string, id: string) {
  try {
    const ids: string[] = JSON.parse(readRaw(key));
    localStorage.setItem(key, JSON.stringify([...ids, id]));
  } catch {
    /* stockage indisponible : sans conséquence */
  }
  window.dispatchEvent(new Event(STORE_EVENT));
}
function subscribe(onChange: () => void) {
  window.addEventListener(STORE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(STORE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function useStoredIds(key: string): string[] {
  // Côté serveur et à l'hydratation : liste vide, puis valeur du navigateur
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => "[]");
  return useMemo(() => {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, [raw]);
}

const fmt1 = (n: number) => n.toFixed(1).replace(".", ",");

export function Stars({ value, size = "1rem" }: { value: number; size?: string }) {
  return (
    <span
      role="img"
      aria-label={`${fmt1(value)} sur 5 étoiles`}
      style={{ fontSize: size, letterSpacing: 1, whiteSpace: "nowrap" }}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        // Remplissage partiel pour les moyennes (ex : 4,4 → 4 étoiles + 40 %)
        const fill = Math.max(0, Math.min(1, value - (n - 1))) * 100;
        return (
          <span
            key={n}
            aria-hidden
            style={{
              backgroundImage: `linear-gradient(90deg, var(--brass) ${fill}%, var(--line) ${fill}%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}

export function ReviewsBoard({
  productId,
  productName,
  productSlug,
  reviews,
  viewer,
}: {
  productId: string;
  productName: string;
  productSlug: string;
  reviews: ReviewItem[];
  viewer: ReviewViewer;
}) {
  const [filter, setFilter] = useState<number | null>(null);
  const [sort, setSort] = useState<"utiles" | "recents">("utiles");
  const [shown, setShown] = useState(PAGE);
  const helpful = useStoredIds(HELPFUL_KEY);
  const reported = useStoredIds(REPORT_KEY);
  const [, startTransition] = useTransition();

  const total = reviews.length;
  const average = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const histogram = [5, 4, 3, 2, 1].map((star) => {
    const n = reviews.filter((r) => r.rating === star).length;
    return { star, n, pct: total ? Math.round((n / total) * 100) : 0 };
  });

  const list = useMemo(() => {
    const filtered = filter ? reviews.filter((r) => r.rating === filter) : reviews;
    return [...filtered].sort((a, b) =>
      sort === "utiles"
        ? b.helpfulCount - a.helpfulCount || b.timestamp - a.timestamp
        : b.timestamp - a.timestamp
    );
  }, [reviews, filter, sort]);

  function chooseFilter(star: number | null) {
    setFilter(star);
    setShown(PAGE);
  }

  function onHelpful(id: string) {
    if (helpful.includes(id)) return;
    addId(HELPFUL_KEY, id);
    startTransition(() => markReviewHelpful(id));
  }

  function onReport(id: string) {
    if (reported.includes(id)) return;
    addId(REPORT_KEY, id);
    startTransition(() => reportReview(id));
  }

  return (
    <section
      id="avis"
      aria-labelledby="avis-title"
      className="reviews-board"
      style={{ marginTop: "3.5rem", paddingTop: "2rem", borderTop: "1px solid var(--line)" }}
    >
      {/* ── Colonne gauche : synthèse ── */}
      <aside>
        <h2 id="avis-title" style={{ fontSize: "1.6rem", color: "var(--forest)" }}>
          Commentaires clients
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: "0.6rem 0 0.25rem" }}>
          <Stars value={average} size="1.45rem" />
          <span style={{ fontSize: "1.1rem" }}>{total ? `${fmt1(average)} sur 5` : "Pas encore noté"}</span>
        </div>
        <p style={{ margin: "0 0 1.1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
          {total} évaluation{total > 1 ? "s" : ""}
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.55rem" }}>
          {histogram.map(({ star, n, pct }) => {
            const active = filter === star;
            return (
              <li key={star}>
                <button
                  type="button"
                  className="histo-row"
                  disabled={n === 0}
                  aria-pressed={active}
                  onClick={() => chooseFilter(active ? null : star)}
                  title={n ? `Voir les avis ${star} étoile${star > 1 ? "s" : ""}` : undefined}
                >
                  <span style={{ width: 62, textAlign: "left" }}>
                    {star} étoile{star > 1 ? "s" : ""}
                  </span>
                  <span className="histo-bar" aria-hidden>
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span style={{ width: 40, textAlign: "right" }}>{pct} %</span>
                </button>
              </li>
            );
          })}
        </ul>
        {filter && (
          <button type="button" onClick={() => chooseFilter(null)} className="link-btn" style={{ marginTop: "0.6rem" }}>
            × Retirer le filtre « {filter} étoile{filter > 1 ? "s" : ""} »
          </button>
        )}

        <div style={{ borderTop: "1px solid var(--line)", marginTop: "1.5rem", paddingTop: "1.5rem" }}>
          <h3 style={{ fontSize: "1.2rem", color: "var(--forest)" }}>Évaluer ce produit</h3>
          <p style={{ margin: "0.4rem 0 0.9rem", fontSize: "0.9rem", color: "var(--muted)" }}>
            Partage ton opinion avec les autres clients
          </p>
          <ReviewDialog productId={productId} productName={productName} productSlug={productSlug} viewer={viewer} />
        </div>
      </aside>

      {/* ── Colonne droite : avis ── */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1.25rem",
          }}
        >
          <h3 style={{ fontSize: "1.35rem", color: "var(--forest)" }}>
            {filter ? `Avis ${filter} étoile${filter > 1 ? "s" : ""}` : "Les meilleurs avis"}
          </h3>
          {total > 1 && (
            <select
              aria-label="Trier les avis"
              value={sort}
              onChange={(e) => setSort(e.target.value as "utiles" | "recents")}
              className="field"
              style={{ width: "auto", padding: "0.45rem 0.75rem", fontSize: "0.85rem" }}
            >
              <option value="utiles">Les plus utiles</option>
              <option value="recents">Les plus récents</option>
            </select>
          )}
        </div>

        {total === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Aucun avis pour l&apos;instant — sois le premier à donner le tien !
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "1.75rem" }}>
            {list.slice(0, shown).map((r) => (
              <li key={r.id}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <span className="avatar" aria-hidden>
                    {r.authorName.trim().charAt(0).toUpperCase()}
                  </span>
                  <span style={{ fontSize: "0.92rem" }}>{r.authorName}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                  <Stars value={r.rating} />
                  {r.title && <strong style={{ fontSize: "0.98rem" }}>{r.title}</strong>}
                </div>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
                  Avis laissé le {r.date}
                  {r.isVerified && (
                    <>
                      <span style={{ margin: "0 0.5rem", color: "var(--line)" }}>|</span>
                      <span style={{ color: "var(--earth)", fontWeight: 600 }}>✓ Achat vérifié</span>
                    </>
                  )}
                </p>
                <p style={{ margin: "0.55rem 0 0", lineHeight: 1.6, whiteSpace: "pre-line" }}>{r.comment}</p>

                {r.helpfulCount > 0 && (
                  <p style={{ margin: "0.55rem 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                    {r.helpfulCount} personne{r.helpfulCount > 1 ? "s ont" : " a"} trouvé cela utile
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginTop: "0.65rem" }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: "0.4rem 1.6rem", fontSize: "0.88rem" }}
                    disabled={helpful.includes(r.id)}
                    onClick={() => onHelpful(r.id)}
                  >
                    {helpful.includes(r.id) ? "✓ Merci !" : "Utile"}
                  </button>
                  <span style={{ width: 1, height: 18, background: "var(--line)" }} aria-hidden />
                  <button
                    type="button"
                    className="link-btn"
                    style={{ color: "var(--muted)", textDecoration: "none" }}
                    disabled={reported.includes(r.id)}
                    onClick={() => onReport(r.id)}
                  >
                    {reported.includes(r.id) ? "Signalé" : "Signaler"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {list.length > shown && (
          <button
            type="button"
            onClick={() => setShown((s) => s + 5)}
            className="more-btn"
          >
            Voir plus de commentaires ({list.length - shown})
          </button>
        )}
      </div>

      <style>{`
        .reviews-board {
          display: grid;
          grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
          gap: 3rem;
          align-items: start;
        }
        @media (max-width: 860px) {
          .reviews-board { grid-template-columns: 1fr; gap: 2rem; }
        }
        .histo-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0;
          border: none;
          background: none;
          font: inherit;
          font-size: 0.92rem;
          color: var(--foliage);
          cursor: pointer;
        }
        .histo-row:disabled { color: var(--muted); cursor: default; }
        .histo-row:not(:disabled):hover span:first-child,
        .histo-row[aria-pressed="true"] span:first-child { text-decoration: underline; }
        .histo-bar {
          flex: 1;
          height: 20px;
          border: 1px solid var(--line);
          border-radius: 5px;
          background: #fff;
          overflow: hidden;
        }
        .histo-row[aria-pressed="true"] .histo-bar { border-color: var(--brass); }
        .histo-bar > span {
          display: block;
          height: 100%;
          background: var(--brass);
        }
        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          display: grid;
          place-items: center;
          background: var(--foliage-soft);
          color: var(--foliage);
          font-weight: 600;
          font-size: 0.9rem;
        }
        .link-btn {
          border: none;
          background: none;
          padding: 0;
          font: inherit;
          font-size: 0.88rem;
          color: var(--foliage);
          text-decoration: underline;
          cursor: pointer;
        }
        .link-btn:disabled { cursor: default; opacity: 0.7; }
        .more-btn {
          display: block;
          width: 100%;
          margin-top: 1.75rem;
          padding: 0.9rem 1.25rem;
          border: 1px solid var(--line);
          border-radius: 0.75rem;
          background: #fff;
          color: var(--foliage);
          font: inherit;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
        }
        .more-btn:hover { border-color: var(--foliage); }
      `}</style>
    </section>
  );
}
