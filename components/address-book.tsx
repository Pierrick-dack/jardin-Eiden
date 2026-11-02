"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { AddressView } from "@/lib/addresses";
import { IconButton, PencilIcon, TrashIcon } from "./icons";
import {
  deleteAddressAction,
  saveAddressAction,
  setDefaultAddressAction,
  type AddressState,
} from "@/app/(boutique)/compte/adresses/actions";

type Props = {
  addresses: AddressView[];
  /** Valeurs proposées pour une 1re adresse (nom et téléphone du compte) */
  defaults: { fullName: string; phone: string };
  /** "select" : choix de l'adresse de livraison (commande) ; "manage" : compte */
  mode: "manage" | "select";
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function AddressBook({ addresses, defaults, mode, selectedId, onSelect }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<AddressView | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, start] = useTransition();

  function openForm(address: AddressView | null) {
    setEditing(address);
    setFormKey((k) => k + 1);
    dialogRef.current?.showModal();
  }

  return (
    <div>
      {addresses.length > 0 && (
        <div className="address-grid" role={mode === "select" ? "radiogroup" : undefined} aria-label="Adresses de livraison">
          {addresses.map((a) => {
            const selected = mode === "select" && selectedId === a.id;
            return (
              <div
                key={a.id}
                className={`address-card${selected ? " is-selected" : ""}`}
                role={mode === "select" ? "radio" : undefined}
                aria-checked={mode === "select" ? selected : undefined}
                tabIndex={mode === "select" ? 0 : undefined}
                onClick={() => mode === "select" && onSelect?.(a.id)}
                onKeyDown={(e) => {
                  if (mode === "select" && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelect?.(a.id);
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                  {mode === "select" && <span className="address-radio" aria-hidden />}
                  <strong>{a.label}</strong>
                  {a.isDefault && <span className="chip" style={{ background: "var(--foliage-soft)", color: "var(--foliage)" }}>Par défaut</span>}
                </div>
                <p style={{ margin: 0, lineHeight: 1.5, fontSize: "0.9rem" }}>
                  {a.fullName} · +{a.phone}
                  <br />
                  {a.address}, {a.city}
                  {a.landmark && (
                    <>
                      <br />
                      <span style={{ color: "var(--muted)" }}>Repère : {a.landmark}</span>
                    </>
                  )}
                </p>
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                  <IconButton
                    label={`Modifier l'adresse ${a.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openForm(a);
                    }}
                  >
                    <PencilIcon />
                  </IconButton>
                  {mode === "manage" && (
                    <IconButton
                      label={`Supprimer l'adresse ${a.label}`}
                      tone="danger"
                      disabled={pending}
                      onClick={() => confirm(`Supprimer l'adresse « ${a.label} » ?`) && start(() => deleteAddressAction(a.id))}
                    >
                      <TrashIcon />
                    </IconButton>
                  )}
                  {mode === "manage" && !a.isDefault && (
                    <button type="button" className="address-link" style={{ marginLeft: "0.4rem" }} disabled={pending} onClick={() => start(() => setDefaultAddressAction(a.id))}>
                      Définir par défaut
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button type="button" className="btn btn-outline" style={{ marginTop: addresses.length ? "1rem" : 0 }} onClick={() => openForm(null)}>
        + Ajouter une adresse
      </button>

      <dialog
        ref={dialogRef}
        className="address-dialog"
        aria-labelledby="address-dialog-title"
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      >
        <div style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "1rem" }}>
            <h2 id="address-dialog-title" style={{ fontSize: "1.35rem", color: "var(--forest)" }}>
              {editing ? "Modifier l'adresse" : "Nouvelle adresse de livraison"}
            </h2>
            <button type="button" aria-label="Fermer" className="address-close" onClick={() => dialogRef.current?.close()}>
              ×
            </button>
          </div>
          <AddressForm
            key={formKey}
            address={editing}
            defaults={defaults}
            isFirst={addresses.length === 0}
            onSaved={(id) => {
              dialogRef.current?.close();
              if (mode === "select") onSelect?.(id);
            }}
          />
        </div>
      </dialog>

      <style>{`
        .address-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.85rem; }
        .address-card {
          border: 1px solid var(--line); border-radius: 0.9rem; background: #fff;
          padding: 0.95rem 1.05rem; transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .address-card[role="radio"] { cursor: pointer; }
        .address-card[role="radio"]:hover { border-color: var(--foliage); }
        .address-card:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }
        .address-card.is-selected { border-color: var(--forest); box-shadow: 0 0 0 1px var(--forest); background: #fbfdfb; }
        .address-radio {
          width: 16px; height: 16px; border-radius: 999px; border: 2px solid var(--muted);
          display: inline-block; flex-shrink: 0;
        }
        .is-selected .address-radio { border-color: var(--forest); background: radial-gradient(var(--forest) 0 40%, #fff 45%); }
        .address-link {
          border: none; background: none; padding: 0; cursor: pointer;
          font: inherit; font-size: 0.85rem; color: var(--foliage); text-decoration: underline;
        }
        .address-dialog {
          margin: auto; width: min(520px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto;
          padding: 0; border: 1px solid var(--line); border-radius: 1.1rem;
          background: var(--ivory); color: var(--ink); box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        }
        .address-dialog::backdrop { background: rgba(30,58,43,0.45); }
        .address-close { border: none; background: transparent; font-size: 1.6rem; line-height: 1; cursor: pointer; color: var(--muted); }
        .address-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
        @media (max-width: 480px) { .address-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function AddressForm({
  address,
  defaults,
  isFirst,
  onSaved,
}: {
  address: AddressView | null;
  defaults: { fullName: string; phone: string };
  isFirst: boolean;
  onSaved: (id: string) => void;
}) {
  const [state, action, pending] = useActionState<AddressState, FormData>(saveAddressAction, {});
  // Un seul appel par enregistrement réussi (le composant se ré-affiche ensuite)
  const handled = useRef<AddressState | null>(null);
  useEffect(() => {
    if (state.ok && state.id && handled.current !== state) {
      handled.current = state;
      onSaved(state.id);
    }
  }, [state, onSaved]);

  return (
    <form action={action} style={{ display: "grid", gap: "0.9rem", marginTop: "1.1rem" }}>
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="address-row">
        <Field label="Nom de l'adresse" name="label" defaultValue={address?.label ?? (isFirst ? "Domicile" : "")} placeholder="Domicile, Bureau…" required={false} />
        <Field label="Ville *" name="city" defaultValue={address?.city} placeholder="Ex : Yaoundé" />
      </div>
      <Field label="Quartier / adresse *" name="address" defaultValue={address?.address} placeholder="Ex : Bastos, rue 1.234" />
      <Field label="Point de repère" name="landmark" defaultValue={address?.landmark ?? ""} placeholder="Ex : face à la pharmacie" required={false} />
      <div className="address-row">
        <Field label="Destinataire *" name="fullName" defaultValue={address?.fullName ?? defaults.fullName} />
        <Field label="Téléphone *" name="phone" type="tel" defaultValue={address?.phone ?? defaults.phone} />
      </div>
      {!isFirst && !address?.isDefault && (
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 400 }}>
          <input type="checkbox" name="isDefault" style={{ accentColor: "var(--forest)" }} /> Utiliser comme adresse par défaut
        </label>
      )}
      {isFirst && (
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
          Cette adresse sera enregistrée et proposée automatiquement pour tes prochaines commandes.
        </p>
      )}
      {state.error && (
        <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.88rem" }}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Enregistrement…" : "Enregistrer l'adresse"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={`addr-${name}`}>{label}</label>
      <input
        id={`addr-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="field"
        style={{ marginTop: 6 }}
      />
    </div>
  );
}
