"use client";

import { useActionState, useState, useTransition } from "react";
import { cancelOrderAction, recordPaymentAction, type AdminActionState } from "../actions";

const METHODS = [
  { value: "MTN_MOMO", label: "MTN Mobile Money" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "ESPECES", label: "Espèces (à la livraison)" },
  { value: "VIREMENT", label: "Virement / autre" },
];

/** Formulaire « Encaisser » : enregistre le paiement reçu */
export function RecordPaymentForm({ id, total }: { id: string; total: string }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(recordPaymentAction.bind(null, id), {});
  return (
    <form action={action} style={{ display: "grid", gap: "0.75rem" }}>
      <div>
        <label htmlFor="method">Moyen de paiement *</label>
        <select id="method" name="method" required defaultValue="" className="field" style={{ marginTop: 6 }}>
          <option value="" disabled>
            Choisir…
          </option>
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="reference">Référence de transaction (facultatif)</label>
        <input id="reference" name="reference" className="field" placeholder="Ex : ID de transaction MoMo" style={{ marginTop: 6 }} />
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Encaissement…" : `💰 Encaisser ${total}`}
      </button>
      <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>
        La commande passe en préparation et le client reçoit aussitôt la confirmation de paiement et sa facture par email.
      </p>
    </form>
  );
}

export function CancelOrderButton({ id, paid }: { id: string; paid: boolean }) {
  const [state, setState] = useState<AdminActionState>({});
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <button
        type="button"
        disabled={pending}
        className="btn btn-outline"
        style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
        onClick={() => {
          const msg = paid
            ? "Annuler cette commande ? Elle sera marquée REMBOURSÉE (pense à rembourser le client) et les articles remis en stock."
            : "Annuler cette commande ? Les articles seront remis en stock.";
          if (confirm(msg)) start(async () => setState(await cancelOrderAction(id)));
        }}
      >
        {pending ? "Annulation…" : paid ? "Annuler et rembourser" : "Annuler la commande"}
      </button>
      <Feedback state={state} />
    </div>
  );
}

function Feedback({ state }: { state: AdminActionState }) {
  if (state.error) return <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.85rem" }}>{state.error}</p>;
  if (state.message) return <p role="status" style={{ margin: 0, color: "var(--success)", fontSize: "0.85rem" }}>✓ {state.message}</p>;
  return null;
}
