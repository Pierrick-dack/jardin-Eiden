"use client";

import { useEffect } from "react";
import { recordProductView } from "@/app/(boutique)/produit/[slug]/actions";

/** Compte une consultation de la fiche, une seule fois par onglet et par produit */
export function TrackView({ productId }: { productId: string }) {
  useEffect(() => {
    const key = `jde-viewed-${productId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* stockage indisponible : on compte quand même */
    }
    recordProductView(productId);
  }, [productId]);

  return null;
}
