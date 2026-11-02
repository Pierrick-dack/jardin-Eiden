"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart-context";
import { IconButton, TrashIcon } from "@/components/icons";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const { lines, subtotal, setQty, remove, count } = useCart();

  if (count === 0) {
    return (
      <div
        className="wrap"
        style={{ padding: "4rem 1.25rem", textAlign: "center" }}
      >
        <h1 style={{ fontSize: "2rem", color: "var(--forest)", marginBottom: "0.75rem" }}>
          Ton panier est vide
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
          Parcours la boutique et ajoute tes produits préférés.
        </p>
        <Link href="/" className="btn btn-primary">
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "2rem", color: "var(--forest)", marginBottom: "1.5rem" }}>
        Mon panier
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 320px",
          gap: "2rem",
          alignItems: "start",
        }}
        className="cart-grid"
      >
        {/* Lignes */}
        <div style={{ display: "grid", gap: "1rem" }}>
          {lines.map((l) => (
            <div
              key={l.productId}
              className="cart-line"
              style={{
                display: "grid",
                gridTemplateColumns: "88px 1fr auto",
                gap: "1rem",
                alignItems: "center",
                padding: "0.85rem",
                border: "1px solid var(--line)",
                borderRadius: "0.8rem",
                background: "#fff",
              }}
            >
              <Link
                href={`/produit/${l.slug}`}
                className="cart-thumb"
                style={{
                  position: "relative",
                  width: 88,
                  height: 88,
                  borderRadius: "0.6rem",
                  overflow: "hidden",
                  background: "var(--ivory-deep)",
                  display: "block",
                }}
              >
                {l.image && (
                  <Image src={l.image} alt={l.name} fill sizes="88px" style={{ objectFit: "cover" }} />
                )}
              </Link>

              <div>
                <Link
                  href={`/produit/${l.slug}`}
                  style={{ textDecoration: "none", color: "var(--ink)" }}
                >
                  <h3 style={{ fontSize: "1rem", marginBottom: "0.2rem" }}>{l.name}</h3>
                </Link>
                <p style={{ margin: 0, color: "var(--foliage)", fontWeight: 600 }}>
                  {formatPrice(l.price)}
                </p>
                <IconButton label={`Retirer ${l.name} du panier`} tone="danger" onClick={() => remove(l.productId)} style={{ marginTop: 6 }}>
                  <TrashIcon />
                </IconButton>
              </div>

              <div className="cart-qty" style={{ textAlign: "right", display: "grid", gap: "0.5rem", justifyItems: "end" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    border: "1px solid var(--line)",
                    borderRadius: 9999,
                  }}
                >
                  <button onClick={() => setQty(l.productId, l.quantity - 1)} style={qtyBtn} aria-label="Diminuer">
                    −
                  </button>
                  <span style={{ minWidth: 30, textAlign: "center", fontWeight: 600 }}>
                    {l.quantity}
                  </span>
                  <button
                    onClick={() => setQty(l.productId, l.quantity + 1)}
                    style={qtyBtn}
                    aria-label="Augmenter"
                    disabled={l.quantity >= l.stock}
                  >
                    +
                  </button>
                </div>
                <strong style={{ fontSize: "0.95rem" }}>
                  {formatPrice(l.price * l.quantity)}
                </strong>
              </div>
            </div>
          ))}
        </div>

        {/* Récapitulatif */}
        <aside
          className="cart-summary"
          style={{
            border: "1px solid var(--line)",
            borderRadius: "0.9rem",
            padding: "1.25rem",
            background: "#fff",
            position: "sticky",
            top: "calc(var(--header-h, 110px) + 12px)",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "var(--forest)" }}>
            Récapitulatif
          </h2>
          <Row label={`Sous-total (${count} article${count > 1 ? "s" : ""})`} value={formatPrice(subtotal)} />
          <Row label="Livraison" value="Calculée à la commande" muted />
          <div style={{ borderTop: "1px solid var(--line)", margin: "0.85rem 0" }} />
          <Row label="Total estimé" value={formatPrice(subtotal)} big />
          <Link
            href="/checkout"
            className="btn btn-brass"
            style={{ width: "100%", marginTop: "1rem" }}
          >
            Passer la commande
          </Link>
          <Link
            href="/"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: "0.75rem",
              fontSize: "0.88rem",
              color: "var(--foliage)",
            }}
          >
            Continuer mes achats
          </Link>
        </aside>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .cart-grid { grid-template-columns: 1fr !important; }
          .cart-summary { position: static !important; }
        }
        /* Smartphone : vignette plus petite, quantité et total sur une ligne dessous */
        @media (max-width: 520px) {
          .cart-line { grid-template-columns: 72px minmax(0, 1fr) !important; gap: 0.75rem !important; align-items: start !important; }
          .cart-thumb { width: 72px !important; height: 72px !important; }
          .cart-qty { grid-column: 1 / -1; display: flex !important; justify-content: space-between; align-items: center; padding-top: 0.65rem; border-top: 1px solid var(--line); }
        }
      `}</style>
    </div>
  );
}

function Row({
  label,
  value,
  big,
  muted,
}: {
  label: string;
  value: string;
  big?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: "0.5rem",
        fontSize: big ? "1.05rem" : "0.9rem",
      }}
    >
      <span style={{ color: muted ? "var(--muted)" : "var(--ink)" }}>{label}</span>
      <strong
        style={{
          fontWeight: big ? 700 : 600,
          color: big ? "var(--forest)" : "var(--ink)",
          fontSize: muted ? "0.82rem" : undefined,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "none",
  background: "transparent",
  fontSize: "1.1rem",
  cursor: "pointer",
  color: "var(--forest)",
};
