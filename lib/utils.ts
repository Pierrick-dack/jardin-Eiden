// Helpers partagés

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "FCFA";

/** Formate un montant entier (FCFA) : 15000 -> "15 000 FCFA" */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString("fr-FR").replace(/ /g, " ")} ${CURRENCY}`;
}

/** Slug URL-safe à partir d'un nom de produit */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Combine des classes conditionnelles */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Normalise un numéro de téléphone camerounais au format international (sans +) */
export function normalizeCameroonPhone(raw: string): string {
  let digits = raw.replace(/[^0-9]/g, "");
  // 6XXXXXXXX (9 chiffres) -> préfixe 237
  if (digits.length === 9 && digits.startsWith("6")) {
    digits = "237" + digits;
  }
  // 06XXXXXXXX -> retire le 0, ajoute 237
  if (digits.length === 10 && digits.startsWith("0")) {
    digits = "237" + digits.slice(1);
  }
  return digits;
}
