"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { checkOrderStatus, type OrderStatusView } from "./actions";
import { OrderTracker } from "@/components/order-tracker";

/** Page de suivi : attend la confirmation d'un paiement en ligne, puis affiche les étapes */
export function OrderStatusClient({ orderId }: { orderId: string }) {
  const [state, setState] = useState<OrderStatusView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    let tries = 0;

    async function poll() {
      // Coupure réseau / base momentanée : on réessaie un peu plus tard
      const res = await checkOrderStatus(orderId).catch(() => null);
      if (!active) return;
      if (!res) {
        tries += 1;
        if (tries < 24) timer.current = setTimeout(poll, 5000);
        else setError("Impossible de charger ta commande pour le moment. Réessaie dans un instant.");
        return;
      }
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setState(res);
      tries += 1;
      // Paiement en ligne en cours : on revérifie toutes les 5 s pendant ~2 min
      if (res.awaitingOnlinePayment) {
        if (tries < 24) timer.current = setTimeout(poll, 5000);
        else setTimedOut(true);
      }
    }

    poll();
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [orderId]);

  if (error) {
    return (
      <Shell>
        <p style={{ color: "var(--danger)", textAlign: "center" }}>{error}</p>
      </Shell>
    );
  }

  if (!state) {
    return (
      <Shell>
        <Spinner />
        <p style={{ color: "var(--muted)", textAlign: "center" }}>Chargement de ta commande…</p>
      </Shell>
    );
  }

  const firstName = state.customerName.split(" ")[0];

  if (state.awaitingOnlinePayment) {
    return (
      <Shell>
        <Spinner />
        <h1 style={{ fontSize: "1.6rem", color: "var(--forest)", textAlign: "center", margin: "0.5rem 0" }}>Paiement en attente</h1>
        <p style={{ color: "var(--muted)", maxWidth: "46ch", margin: "0 auto", lineHeight: 1.6, textAlign: "center" }}>
          Commande <strong>{state.tracking.reference}</strong>. Valide le paiement sur ton téléphone (MTN MoMo / Orange Money) : cette page se met à jour
          automatiquement.
        </p>
        {timedOut && (
          <p style={{ fontSize: "0.88rem", color: "var(--earth)", textAlign: "center", marginTop: "1rem" }}>
            Toujours rien ? Si tu as payé, ta commande sera confirmée dès réception du paiement : tu recevras un email.
          </p>
        )}
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "2.4rem" }}>{state.paid ? "✅" : "🌿"}</div>
        <h1 style={{ fontSize: "1.8rem", color: "var(--forest)", margin: "0.4rem 0" }}>
          {state.tracking.cancelled ? "Commande annulée" : state.paid ? `Merci ${firstName} !` : "Commande enregistrée !"}
        </h1>
        {!state.tracking.cancelled && (
          <p style={{ color: "var(--muted)", maxWidth: "48ch", margin: "0 auto", lineHeight: 1.6 }}>
            {state.paid
              ? "Ton paiement est confirmé et ta facture t'a été envoyée par email. Suis ici chaque étape jusqu'à la livraison."
              : "Notre équipe a été prévenue : elle valide ta commande et te contacte pour le paiement. Tu seras notifié à chaque étape."}
          </p>
        )}
      </div>
      <OrderTracker tracking={state.tracking} />
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
        <Link href="/compte" className="btn btn-primary">
          Mes commandes
        </Link>
        <Link href="/boutique" className="btn btn-outline">
          Continuer mes achats
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap" style={{ paddingTop: "3rem", paddingBottom: "3.5rem" }}>
      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
          border: "1px solid var(--line)",
          borderRadius: "1.2rem",
          padding: "clamp(1.5rem, 4vw, 2.5rem)",
          background: "#fff",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <>
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid var(--line)",
          borderTopColor: "var(--foliage)",
          borderRadius: "50%",
          margin: "0 auto 1rem",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
