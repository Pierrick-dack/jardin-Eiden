"use client";

import { useTransition } from "react";
import { updateOrderStatus } from "./actions";

const OPTIONS = [
  { value: "EN_PREPARATION", label: "En préparation" },
  { value: "EXPEDIEE", label: "Expédiée" },
  { value: "LIVREE", label: "Livrée" },
];

/** Étape de livraison (le paiement et l'annulation se gèrent à part) */
export function OrderStatusSelect({ id, current }: { id: string; current: string }) {
  const [pending, start] = useTransition();
  if (current === "ANNULEE") return <span style={{ color: "var(--danger)", fontSize: "0.85rem" }}>Commande annulée</span>;
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 400 }}>
      <span style={{ color: "var(--muted)" }}>Livraison :</span>
      <select
        defaultValue={OPTIONS.some((o) => o.value === current) ? current : ""}
        disabled={pending}
        onChange={(e) => e.target.value && start(() => updateOrderStatus(id, e.target.value))}
        className="field"
        style={{ padding: "0.35rem 0.6rem", width: "auto", fontSize: "0.85rem" }}
      >
        {!OPTIONS.some((o) => o.value === current) && <option value="">— À préparer —</option>}
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
