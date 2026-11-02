// Interrupteurs de configuration de la boutique.

// Paiement en ligne activé ?
// - true  : le client paie par Mobile Money (Fapshi) avant transmission WhatsApp.
// - false : pas de paiement en ligne. La commande est enregistrée et envoyée
//           directement sur WhatsApp ; paiement + livraison gérés manuellement.
// Mettre PAYMENTS_ENABLED="false" dans .env pour désactiver (logique serveur).
export const paymentsEnabled = process.env.PAYMENTS_ENABLED !== "false";

// Version lisible côté navigateur (pour les textes d'interface uniquement).
// Mettre aussi NEXT_PUBLIC_PAYMENTS_ENABLED="false" dans .env.
export const paymentsEnabledPublic =
  process.env.NEXT_PUBLIC_PAYMENTS_ENABLED !== "false";
