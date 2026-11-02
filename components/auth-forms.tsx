"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, signupAction, type AuthState } from "@/app/(boutique)/connexion/actions";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, {});
  return (
    <form action={action} style={{ display: "grid", gap: "1rem" }}>
      <input type="hidden" name="next" value={next} />
      {notice && <Notice>{notice}</Notice>}
      <Field label="Adresse email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} />
      <PasswordField label="Mot de passe" name="password" autoComplete="current-password" />
      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
      <button type="submit" disabled={pending} className="btn btn-primary" style={{ width: "100%" }}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <p style={{ margin: 0, textAlign: "center", fontSize: "0.92rem", color: "var(--muted)" }}>
        Nouveau sur Le Jardin d&apos;Eïden ?{" "}
        <Link href={`/inscription?next=${encodeURIComponent(next)}`} className="link-muted">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signupAction, {});
  const v = state.values ?? {};
  return (
    <form action={action} style={{ display: "grid", gap: "1rem" }}>
      <input type="hidden" name="next" value={next} />
      <div className="auth-row">
        <Field label="Prénom" name="firstName" autoComplete="given-name" defaultValue={v.firstName} />
        <Field label="Nom" name="lastName" autoComplete="family-name" defaultValue={v.lastName} />
      </div>
      <Field
        label="Adresse email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={v.email}
      />
      <Field
        label="Téléphone / WhatsApp"
        name="phone"
        type="tel"
        autoComplete="tel"
        placeholder="Ex : 6 90 00 00 00"
        defaultValue={v.phone}
        hint="Numéro Mobile Money utilisé pour le paiement et le suivi de livraison."
      />
      <PasswordField
        label="Mot de passe"
        name="password"
        autoComplete="new-password"
        hint="Au moins 8 caractères, dont une lettre et un chiffre."
      />
      <PasswordField label="Confirme le mot de passe" name="confirm" autoComplete="new-password" />
      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
      <button type="submit" disabled={pending} className="btn btn-primary" style={{ width: "100%" }}>
        {pending ? "Création du compte…" : "Créer mon compte"}
      </button>
      <p style={{ margin: 0, textAlign: "center", fontSize: "0.92rem", color: "var(--muted)" }}>
        Déjà un compte ?{" "}
        <Link href={`/connexion?next=${encodeURIComponent(next)}`} className="link-muted">
          Se connecter
        </Link>
      </p>
      <style>{`
        .auth-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 480px) { .auth-row { grid-template-columns: 1fr; } }
      `}</style>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  hint,
  ...rest
}: { label: string; name: string; type?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} required className="field" style={{ marginTop: 6 }} {...rest} />
      {hint && <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>{hint}</p>}
    </div>
  );
}

function PasswordField({ label, name, hint, autoComplete }: { label: string; name: string; hint?: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <div style={{ position: "relative", marginTop: 6 }}>
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          className="field"
          style={{ paddingRight: "5.5rem" }}
        />
        <button
          type="button"
          onClick={() => setVisible((x) => !x)}
          aria-pressed={visible}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "none",
            color: "var(--foliage)",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {visible ? "Masquer" : "Afficher"}
        </button>
      </div>
      {hint && <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>{hint}</p>}
    </div>
  );
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      style={{
        margin: 0,
        color: "var(--danger)",
        background: "#fbeae8",
        border: "1px solid #e8c4bf",
        borderRadius: 8,
        padding: "0.65rem 0.9rem",
        fontSize: "0.88rem",
      }}
    >
      {children}
    </p>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        background: "var(--foliage-soft)",
        color: "var(--forest)",
        borderRadius: 8,
        padding: "0.65rem 0.9rem",
        fontSize: "0.88rem",
      }}
    >
      {children}
    </p>
  );
}
