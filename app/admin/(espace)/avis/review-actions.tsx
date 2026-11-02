"use client";

import { useTransition } from "react";
import { deleteReview, setReviewPublished } from "./actions";
import { IconButton, TrashIcon } from "@/components/icons";

export function ReviewModeration({ id, published, reported }: { id: string; published: boolean; reported: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {published ? (
        <button type="button" disabled={pending} className="btn btn-outline" style={small} onClick={() => start(() => setReviewPublished(id, false))}>
          Masquer
        </button>
      ) : null}
      {(!published || reported) && (
        <button type="button" disabled={pending} className="btn btn-primary" style={small} onClick={() => start(() => setReviewPublished(id, true))}>
          {published ? "Conserver (ignorer le signalement)" : "Republier"}
        </button>
      )}
      <IconButton
        label="Supprimer cet avis"
        tone="danger"
        disabled={pending}
        onClick={() => confirm("Supprimer définitivement cet avis ?") && start(() => deleteReview(id))}
      >
        <TrashIcon />
      </IconButton>
    </div>
  );
}

const small: React.CSSProperties = { padding: "0.4rem 0.85rem", fontSize: "0.82rem" };
