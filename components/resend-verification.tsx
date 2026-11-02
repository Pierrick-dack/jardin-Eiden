"use client";

import { useActionState } from "react";
import { resendVerificationAction, type ResendState } from "@/app/(boutique)/connexion/actions";

/** Bouton « Renvoyer l'email de confirmation » */
export function ResendVerification({ next, label = "Renvoyer l'email" }: { next: string; label?: string }) {
  const [state, action, pending] = useActionState<ResendState, FormData>(resendVerificationAction, {});
  return (
    <form action={action} style={{ display: "grid", gap: "0.6rem", justifyItems: "start" }}>
      <input type="hidden" name="next" value={next} />
      <button type="submit" className="btn btn-outline" disabled={pending}>
        {pending ? "Envoi…" : label}
      </button>
      {state.sent && (
        <p role="status" style={{ margin: 0, fontSize: "0.88rem", color: "var(--success)" }}>
          ✓ Email envoyé. Pense à vérifier tes spams.
        </p>
      )}
      {state.error && (
        <p role="alert" style={{ margin: 0, fontSize: "0.88rem", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
