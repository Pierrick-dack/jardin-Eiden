"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "./cart-context";
import { formatPrice } from "@/lib/utils";

export type BundleItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
};

/** Le 1er élément est le produit consulté, les suivants ses compléments */
export function BoughtTogether({ items }: { items: BundleItem[] }) {
  const { add } = useCart();
  const [checked, setChecked] = useState(() => items.map((i) => i.stock > 0));
  const [added, setAdded] = useState(false);

  const selected = items.filter((_, i) => checked[i]);
  const total = selected.reduce((s, i) => s + i.price, 0);

  function addAll() {
    for (const { productId, slug, name, price, image, stock } of selected) {
      add({ productId, slug, name, price, image, stock }, 1);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <section style={{ marginTop: "3.5rem" }} aria-labelledby="bundle-title">
      <h2 id="bundle-title" style={{ fontSize: "1.5rem", color: "var(--forest)", marginBottom: "1.25rem" }}>
        Fréquemment achetés ensemble
      </h2>
      <div className="bundle">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {items.map((item, i) => (
            <Fragment key={item.productId}>
              {i > 0 && (
                <span aria-hidden style={{ fontSize: "1.6rem", color: "var(--muted)" }}>
                  +
                </span>
              )}
              <Link
                href={`/produit/${item.slug}`}
                className="bundle-thumb"
                style={{ opacity: checked[i] ? 1 : 0.4 }}
                aria-label={item.name}
              >
                {item.image && (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="120px"
                    style={{ objectFit: "cover" }}
                    // 1re vignette = le produit affiché, dont la photo est déjà chargée en haut de page
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                )}
              </Link>
            </Fragment>
          ))}
        </div>

        <div style={{ display: "grid", gap: "0.5rem", alignContent: "start" }}>
          {items.map((item, i) => (
            <label key={item.productId} style={{ display: "flex", gap: "0.55rem", alignItems: "start", fontWeight: 400, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={checked[i]}
                disabled={item.stock <= 0}
                onChange={(e) => setChecked((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                style={{ marginTop: 3, accentColor: "var(--forest)" }}
              />
              <span style={{ fontSize: "0.92rem" }}>
                {i === 0 && <strong>Cet article : </strong>}
                {item.name}{" "}
                <span style={{ color: "var(--foliage)", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {formatPrice(item.price)}
                </span>
                {item.stock <= 0 && <span style={{ color: "var(--danger)" }}> — épuisé</span>}
              </span>
            </label>
          ))}
          <p style={{ margin: "0.5rem 0 0.25rem", fontSize: "0.95rem" }}>
            Prix total : <strong style={{ color: "var(--forest)", fontSize: "1.1rem" }}>{formatPrice(total)}</strong>
          </p>
          <button
            type="button"
            className="btn btn-brass"
            disabled={selected.length === 0}
            onClick={addAll}
            style={{ justifySelf: "start" }}
          >
            {added
              ? "✓ Ajouté au panier"
              : selected.length === items.length
                ? `Ajouter les ${selected.length} au panier`
                : `Ajouter la sélection (${selected.length}) au panier`}
          </button>
        </div>
      </div>

      <style>{`
        .bundle {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 2rem;
          align-items: center;
          padding: 1.25rem;
          border: 1px solid var(--line);
          border-radius: 1rem;
          background: #fff;
        }
        @media (max-width: 860px) {
          .bundle { grid-template-columns: 1fr; }
        }
        .bundle-thumb {
          position: relative;
          display: block;
          width: 110px;
          height: 110px;
          border-radius: 0.75rem;
          overflow: hidden;
          border: 1px solid var(--line);
          background: var(--ivory-deep);
          transition: opacity 0.2s ease;
        }
      `}</style>
    </section>
  );
}
