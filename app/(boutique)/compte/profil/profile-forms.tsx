"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { resizeToSquare } from "@/lib/resize-image";
import { changePassword, updateProfile, uploadAvatar, type ProfileState } from "./actions";

/** Doit rester égal à AVATAR_SIZE (lib/media.ts), vérifié côté serveur */
const AVATAR = 400;

type Profile = { firstName: string; lastName: string; email: string; phone: string; avatarUrl: string | null };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});
  const [avatar, setAvatar] = useState(profile.avatarUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<"idle" | "resizing" | "uploading">("idle");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File) {
    setPhotoError(null);
    setPhotoStatus("resizing");
    try {
      const { blob } = await resizeToSquare(file, AVATAR, { minSource: 200, quality: 0.9 });
      setPreview(URL.createObjectURL(blob));
      setPhotoStatus("uploading");
      const fd = new FormData();
      fd.append("photo", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      const res = await uploadAvatar(fd);
      if ("error" in res) {
        setPhotoError(res.error);
        setPreview(null);
      } else setAvatar(res.url);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Échec du traitement de la photo.");
      setPreview(null);
    } finally {
      setPhotoStatus("idle");
    }
  }

  const busy = photoStatus !== "idle";
  const shown = preview ?? avatar;
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

  return (
    <form action={action} className="pf-card">
      <h2>Informations personnelles</h2>
      <input type="hidden" name="avatarUrl" value={avatar ?? ""} />

      <div className="pf-avatar-row">
        <div className="pf-avatar" aria-hidden>
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou photo en base
            <img src={shown} alt="" />
          ) : (
            <span>{initials}</span>
          )}
          {busy && (
            <span className="pf-avatar-loading" role="status">
              <span className="pf-spinner" />
            </span>
          )}
        </div>
        <div style={{ display: "grid", gap: "0.45rem", justifyItems: "start" }}>
          <strong style={{ fontSize: "0.95rem" }}>Photo de profil</strong>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-outline pf-small" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? (photoStatus === "resizing" ? "Redimensionnement…" : "Enregistrement…") : shown ? "Changer la photo" : "Ajouter une photo"}
            </button>
            {shown && !busy && (
              <button
                type="button"
                className="btn pf-small pf-link"
                onClick={() => {
                  setAvatar(null);
                  setPreview(null);
                }}
              >
                Retirer
              </button>
            )}
          </div>
          <span className="pf-hint">JPEG, PNG ou WebP. Recadrée au centre et redimensionnée automatiquement. Pense à enregistrer.</span>
          {photoError && (
            <span role="alert" style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
              {photoError}
            </span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="pf-row">
        <Field label="Prénom *" name="firstName" defaultValue={profile.firstName} autoComplete="given-name" />
        <Field label="Nom *" name="lastName" defaultValue={profile.lastName} autoComplete="family-name" />
      </div>
      <Field label="Téléphone / WhatsApp *" name="phone" type="tel" defaultValue={`+${profile.phone}`} autoComplete="tel" />
      <div>
        <label htmlFor="pf-email">Adresse email</label>
        <input id="pf-email" value={profile.email} readOnly disabled className="field" style={{ marginTop: 6, background: "var(--ivory-deep)", color: "var(--muted)" }} />
        <span className="pf-hint">L&apos;email identifie ton compte et reçoit tes factures : il ne peut pas être modifié.</span>
      </div>

      <Feedback state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending || busy}>
        {pending ? "Enregistrement…" : "Enregistrer mes informations"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ProfileState, FormData>(changePassword, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="pf-card">
      <h2>Mot de passe</h2>
      <Field label="Mot de passe actuel *" name="current" type="password" autoComplete="current-password" />
      <div className="pf-row">
        <Field label="Nouveau mot de passe *" name="password" type="password" autoComplete="new-password" />
        <Field label="Confirmer *" name="confirm" type="password" autoComplete="new-password" />
      </div>
      <span className="pf-hint">8 caractères minimum, avec au moins une lettre et un chiffre.</span>
      <Feedback state={state} />
      <button type="submit" className="btn btn-outline" disabled={pending}>
        {pending ? "Modification…" : "Modifier le mot de passe"}
      </button>
    </form>
  );
}

function Field({ label, name, type = "text", defaultValue, autoComplete }: { label: string; name: string; type?: string; defaultValue?: string; autoComplete?: string }) {
  return (
    <div>
      <label htmlFor={`pf-${name}`}>{label}</label>
      <input id={`pf-${name}`} name={name} type={type} required defaultValue={defaultValue} autoComplete={autoComplete} className="field" style={{ marginTop: 6 }} />
    </div>
  );
}

function Feedback({ state }: { state: ProfileState }) {
  if (state.error)
    return (
      <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.9rem" }}>
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" style={{ margin: 0, color: "var(--success)", fontSize: "0.9rem" }}>
        ✓ {state.message}
      </p>
    );
  return null;
}
