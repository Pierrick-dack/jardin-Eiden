// Publics des produits : libellés et règles d'affichage dans les sélections.
import type { Audience } from "./db/schema";

export const audienceLabel: Record<Audience, string> = {
  HOMME: "Homme",
  FEMME: "Femme",
  UNISEXE: "Mixte",
  FILLE: "Fille",
  GARCON: "Garçon",
  ENFANT: "Enfant",
};

/** Sélections proposées aux clients (filtre « Pour ») */
export type Genre = "femme" | "homme" | "enfants" | "filles" | "garcons";

// Publics inclus dans chaque sélection : les produits mixtes apparaissent
// des deux côtés (adultes d'un côté, enfants de l'autre)
export const genreAudiences: Record<Genre, Audience[]> = {
  femme: ["FEMME", "UNISEXE"],
  homme: ["HOMME", "UNISEXE"],
  enfants: ["FILLE", "GARCON", "ENFANT"],
  filles: ["FILLE", "ENFANT"],
  garcons: ["GARCON", "ENFANT"],
};

export const isKid = (a: Audience) => a === "FILLE" || a === "GARCON" || a === "ENFANT";

/** Deux produits visent-ils un public compatible ? (recommandations) */
export function sameAudience(a: Audience, b: Audience) {
  if (isKid(a) !== isKid(b)) return false;
  const mixed = a === "UNISEXE" || a === "ENFANT" || b === "UNISEXE" || b === "ENFANT";
  return mixed || a === b;
}
