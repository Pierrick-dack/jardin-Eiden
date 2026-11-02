"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProductOnline } from "./actions";

/** Publier un brouillon en boutique, ou retirer un produit de la boutique */
export function PublishButton({ id, online }: { id: string; online: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggle() {
    if (online && !confirm("Retirer ce produit de la boutique ? Il ne sera plus visible ni commandable.")) return;
    setError(null);
    start(async () => {
      const res = await setProductOnline(id, !online);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={online ? "btn btn-outline" : "btn btn-primary"}
        style={online ? { borderColor: "var(--danger)", color: "var(--danger)" } : undefined}
      >
        {pending ? "Un instant…" : online ? "Retirer de la boutique" : "✓ Publier en boutique"}
      </button>
      {error && (
        <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.85rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
