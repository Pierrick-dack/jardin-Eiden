"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { createCategory, deleteCategory, renameCategory, type CategoryState } from "./actions";
import { CheckIcon, IconButton, TrashIcon } from "@/components/icons";

export function NewCategoryForm() {
  const [state, action, pending] = useActionState<CategoryState, FormData>(createCategory, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "start" }}>
      <div style={{ flex: "1 1 240px" }}>
        <input name="name" required placeholder="Nom de la nouvelle catégorie" aria-label="Nom de la catégorie" className="field" />
        {state.error && <p style={{ margin: "0.3rem 0 0", color: "var(--danger)", fontSize: "0.85rem" }}>{state.error}</p>}
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Ajout…" : "+ Ajouter"}
      </button>
    </form>
  );
}

export function CategoryRow({ id, name, slug, count }: { id: string; name: string; slug: string; count: number }) {
  const [pending, start] = useTransition();
  const rename = renameCategory.bind(null, id);
  return (
    <tr style={{ borderTop: "1px solid var(--line)" }}>
      <td style={{ padding: "0.6rem 1rem" }}>
        <form action={rename} style={{ display: "flex", gap: "0.5rem" }}>
          <input name="name" defaultValue={name} required aria-label={`Nom de ${name}`} className="field" style={{ maxWidth: 280 }} />
          <IconButton type="submit" label={`Enregistrer le nouveau nom de ${name}`} style={{ alignSelf: "center" }}>
            <CheckIcon />
          </IconButton>
        </form>
      </td>
      <td style={{ padding: "0.6rem 1rem", color: "var(--muted)" }}>
        <a href={`/categorie/${slug}`} target="_blank" rel="noreferrer" className="link-muted">
          /categorie/{slug}
        </a>
      </td>
      <td style={{ padding: "0.6rem 1rem" }}>{count}</td>
      <td style={{ padding: "0.6rem 1rem" }}>
        <IconButton
          label={`Supprimer ${name}`}
          tone="danger"
          disabled={pending}
          onClick={() => {
            const msg = count
              ? `Supprimer « ${name} » ? Ses ${count} produit(s) resteront en ligne, sans catégorie.`
              : `Supprimer « ${name} » ?`;
            if (confirm(msg)) start(() => deleteCategory(id));
          }}
        >
          <TrashIcon />
        </IconButton>
      </td>
    </tr>
  );
}
