import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { requireCustomerPage } from "@/lib/customer-auth";
import { CheckoutForm } from "./checkout-form";
import { ResendVerification } from "@/components/resend-verification";
import { getAddresses, toAddressView } from "@/lib/addresses";

export const metadata: Metadata = { title: "Finaliser la commande", robots: { index: false } };

// Compte obligatoire pour commander : l'email du compte reçoit la confirmation
// de paiement, la facture et le récapitulatif. Le panier (navigateur) est conservé
// pendant la connexion ou l'inscription.
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="wrap" style={{ padding: "4rem 0", textAlign: "center", color: "var(--muted)" }}>
          Chargement…
        </div>
      }
    >
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const c = await requireCustomerPage("/checkout");
  // L'email doit être confirmé : il recevra la confirmation et la facture
  if (!c.emailVerifiedAt) {
    return (
      <div className="wrap" style={{ paddingTop: "3rem", paddingBottom: "4rem" }}>
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            textAlign: "center",
            border: "1px solid var(--line)",
            borderRadius: "1.25rem",
            background: "#fff",
            padding: "clamp(1.75rem, 5vw, 3rem)",
            display: "grid",
            justifyItems: "center",
            gap: "0.75rem",
          }}
        >
          <p style={{ fontSize: "2.4rem", margin: 0 }}>📬</p>
          <h1 style={{ fontSize: "1.7rem", color: "var(--forest)" }}>Confirme ton email pour commander</h1>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: "0 0 0.5rem" }}>
            Clique sur le lien envoyé à <strong style={{ color: "var(--ink)" }}>{c.email}</strong>, puis reviens ici :
            ton panier est conservé.
          </p>
          <ResendVerification next="/checkout" />
        </div>
      </div>
    );
  }
  // Carnet d'adresses : l'adresse par défaut est présélectionnée (lu à la requête)
  await connection();
  const addresses = (await getAddresses(c.id)).map(toAddressView);
  return (
    <CheckoutForm
      customer={{ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone }}
      addresses={addresses}
    />
  );
}
