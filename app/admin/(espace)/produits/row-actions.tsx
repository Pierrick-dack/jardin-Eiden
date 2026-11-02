"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteProduct, setProductOnline } from "./actions";
import { ExternalIcon, EyeIcon, EyeOffIcon, IconButton, PencilIcon, TrashIcon } from "@/components/icons";

export function ProductRowActions({
  id,
  isActive,
  published,
  name,
  slug,
}: {
  id: string;
  isActive: boolean;
  /** Déjà publié au moins une fois (sinon brouillon) */
  published: boolean;
  name: string;
  slug: string;
}) {
  const [pending, start] = useTransition();

  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
      <Link href={`/admin/produits/${id}/apercu`} className="icon-btn" aria-label={`Aperçu de ${name}`} title="Aperçu">
        <EyeIcon />
      </Link>
      {isActive && (
        <a href={`/produit/${slug}`} target="_blank" rel="noreferrer" className="icon-btn" aria-label={`Voir ${name} sur la boutique`} title="Voir sur la boutique">
          <ExternalIcon />
        </a>
      )}
      <Link href={`/admin/produits/${id}`} className="icon-btn" aria-label={`Modifier ${name}`} title="Modifier">
        <PencilIcon />
      </Link>
      {isActive ? (
        <IconButton label="Retirer de la boutique" onClick={() => start(async () => void (await setProductOnline(id, false)))} disabled={pending}>
          <EyeOffIcon />
        </IconButton>
      ) : (
        <IconButton
          label={published ? "Remettre en boutique" : "Publier en boutique"}
          onClick={() =>
            start(async () => {
              const res = await setProductOnline(id, true);
              if (res.error) alert(res.error);
            })
          }
          disabled={pending}
          style={{ color: "var(--success)" }}
        >
          <UploadIcon />
        </IconButton>
      )}
      <IconButton
        label={`Supprimer ${name}`}
        tone="danger"
        onClick={() => {
          if (confirm(`Supprimer « ${name} » définitivement ? (Pour le retirer temporairement de la boutique, utilise plutôt « Retirer de la boutique ».)`)) {
            start(() => deleteProduct(id));
          }
        }}
        disabled={pending}
      >
        <TrashIcon />
      </IconButton>
    </div>
  );
}

/** Mise en ligne (flèche vers le haut) */
function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}
