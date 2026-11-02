"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { BrandMark } from "@/components/brand-mark";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1.25rem",
      }}
    >
      <form
        action={action}
        style={{
          width: "100%",
          maxWidth: 380,
          border: "1px solid var(--line)",
          borderRadius: "1rem",
          padding: "2rem",
          background: "#fff",
          display: "grid",
          gap: "1rem",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--forest)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
            <BrandMark size={40} />
          </div>
          <h1 style={{ fontSize: "1.5rem" }}>Espace admin</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Le Jardin d&apos;Eïden
          </p>
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="field" style={{ marginTop: 6 }} />
        </div>
        <div>
          <label htmlFor="password">Mot de passe</label>
          <input id="password" name="password" type="password" required className="field" style={{ marginTop: 6 }} />
        </div>

        {state?.error && (
          <p role="alert" style={{ color: "var(--danger)", fontSize: "0.88rem", margin: 0 }}>
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary" style={{ width: "100%" }}>
          {pending ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
