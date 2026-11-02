"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-context";
import { formatPrice } from "@/lib/utils";
import { paymentsEnabledPublic } from "@/lib/config";
import { submitCheckout } from "./actions";
import { AddressBook } from "@/components/address-book";
import type { AddressView } from "@/lib/addresses";

export type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export function CheckoutForm({ customer, addresses }: { customer: CheckoutCustomer; addresses: AddressView[] }) {
  const { lines, subtotal, count, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Adresse par défaut présélectionnée (la 1re de la liste)
  const [addressId, setAddressId] = useState<string | null>(addresses[0]?.id ?? null);
  const selected = addresses.find((a) => a.id === addressId) ?? null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) {
      setError("Ajoute ou choisis une adresse de livraison.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      addressId: selected.id,
      deliveryNote: String(form.get("deliveryNote") || ""),
      cart: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    };

    const res = await submitCheckout(payload);
    if (!res.ok) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    // Vide le panier et redirige : vers Fapshi (paiement) ou vers le suivi de
    // commande (mode sans paiement en ligne).
    clear();
    if (res.mode === "pay" && res.paymentUrl) {
      window.location.href = res.paymentUrl;
    } else {
      window.location.href = `/commande/${res.orderId}`;
    }
  }

  if (count === 0) {
    return (
      <div className="wrap" style={{ padding: "4rem 1.25rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.8rem", color: "var(--forest)", marginBottom: "0.75rem" }}>
          Rien à commander
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
          Ajoute d&apos;abord des produits à ton panier.
        </p>
        <Link href="/" className="btn btn-primary">
          Aller à la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "2rem", color: "var(--forest)", marginBottom: "0.5rem" }}>
        Finaliser la commande
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.75rem" }}>
        {paymentsEnabledPublic
          ? "Choisis ton adresse de livraison. Tu seras ensuite redirigé vers le paiement Mobile Money sécurisé."
          : "Choisis ton adresse de livraison. Ta commande nous sera transmise sur WhatsApp pour organiser le paiement et la livraison."}
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 320px",
          gap: "2rem",
          alignItems: "start",
        }}
        className="checkout-grid"
      >
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <fieldset style={fieldset}>
            <legend style={legend}>Adresse de livraison</legend>
            <div style={{ display: "grid", gap: "1rem" }}>
              {addresses.length === 0 && (
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.92rem" }}>
                  Ajoute ton adresse de livraison : elle sera enregistrée pour tes prochaines commandes.
                </p>
              )}
              <AddressBook
                addresses={addresses}
                defaults={{ fullName: `${customer.firstName} ${customer.lastName}`, phone: customer.phone }}
                mode="select"
                selectedId={addressId}
                onSelect={setAddressId}
              />
              <div>
                <label htmlFor="deliveryNote">Note pour la livraison (optionnel)</label>
                <textarea
                  id="deliveryNote"
                  name="deliveryNote"
                  rows={2}
                  className="field"
                  placeholder="Instructions particulières..."
                  style={{ marginTop: 6, resize: "vertical" }}
                />
              </div>
              <div
                style={{
                  background: "var(--foliage-soft)",
                  borderRadius: 8,
                  padding: "0.7rem 0.9rem",
                  fontSize: "0.88rem",
                  color: "var(--forest)",
                }}
              >
                📧 La confirmation de paiement, ta facture et le récapitulatif seront envoyés à{" "}
                <strong>{customer.email}</strong>
              </div>
            </div>
          </fieldset>

          {error && (
            <p
              role="alert"
              style={{
                color: "var(--danger)",
                background: "#fbeae8",
                border: "1px solid #e8c4bf",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                margin: 0,
                fontSize: "0.9rem",
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Récapitulatif */}
        <aside
          style={{
            border: "1px solid var(--line)",
            borderRadius: "0.9rem",
            padding: "1.25rem",
            background: "#fff",
            position: "sticky",
            top: "calc(var(--header-h, 110px) + 12px)",
          }}
        >
          <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem", color: "var(--forest)" }}>
            Ta commande
          </h2>
          <div style={{ display: "grid", gap: "0.6rem", marginBottom: "1rem" }}>
            {lines.map((l) => (
              <div
                key={l.productId}
                style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", gap: "0.5rem" }}
              >
                <span style={{ color: "var(--ink)" }}>
                  {l.quantity} × {l.name}
                </span>
                <span style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                  {formatPrice(l.price * l.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem" }}>
              <strong>Total</strong>
              <strong style={{ color: "var(--forest)" }}>{formatPrice(subtotal)}</strong>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 6 }}>
              Les frais de livraison seront confirmés sur WhatsApp selon ta zone.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !selected}
            className="btn btn-brass"
            style={{ width: "100%", marginTop: "1rem" }}
          >
            {submitting
              ? "Envoi..."
              : paymentsEnabledPublic
                ? "Payer par Mobile Money"
                : "Valider ma commande"}
          </button>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.75rem", textAlign: "center" }}>
            {paymentsEnabledPublic
              ? "🔒 Paiement sécurisé via Fapshi (MTN MoMo / Orange Money)"
              : "💬 Ta commande sera transmise sur WhatsApp"}
          </p>
        </aside>
      </form>

      <style>{`
        @media (max-width: 760px) {
          .checkout-grid { grid-template-columns: 1fr !important; } .checkout-grid > aside { position: static !important; }
        }
      `}</style>
    </div>
  );
}

const fieldset: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: "0.9rem",
  padding: "1.25rem",
  background: "#fff",
};
const legend: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "1.1rem",
  color: "var(--forest)",
  padding: "0 0.5rem",
  fontWeight: 600,
};
