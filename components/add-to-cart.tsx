"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./cart-context";

type Props = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
};

export function AddToCart({ productId, slug, name, price, stock, image }: Props) {
  const { add, lines } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const inCart = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  const remaining = Math.max(0, stock - inCart);
  const soldOut = stock <= 0;
  const maxReached = remaining <= 0;

  function handleAdd() {
    if (soldOut || maxReached) return;
    add({ productId, slug, name, price, image, stock }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (soldOut) {
    return (
      <button className="btn" disabled style={{ background: "var(--line)", color: "var(--muted)" }}>
        Produit épuisé
      </button>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
          Quantité
        </span>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid var(--line)",
            borderRadius: 9999,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Diminuer"
            style={qtyBtn}
          >
            −
          </button>
          <span style={{ minWidth: 36, textAlign: "center", fontWeight: 600 }}>
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(remaining, q + 1))}
            aria-label="Augmenter"
            disabled={qty >= remaining}
            style={qtyBtn}
          >
            +
          </button>
        </div>
        <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
          {remaining} en stock
        </span>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={handleAdd}
          disabled={maxReached}
          className="btn btn-primary"
        >
          {added ? "✓ Ajouté au panier" : "Ajouter au panier"}
        </button>
        <button
          onClick={() => {
            if (!maxReached) add({ productId, slug, name, price, image, stock }, qty);
            router.push("/panier");
          }}
          className="btn btn-brass"
        >
          Commander
        </button>
      </div>
      {maxReached && (
        <p style={{ fontSize: "0.82rem", color: "var(--danger)", margin: 0 }}>
          Tu as déjà le stock maximum dans ton panier.
        </p>
      )}
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  border: "none",
  background: "transparent",
  fontSize: "1.2rem",
  cursor: "pointer",
  color: "var(--forest)",
};
