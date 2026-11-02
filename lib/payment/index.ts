// Point d'entrée paiement : expose le provider actif.
// Pour changer d'agrégateur, remplace simplement l'import ci-dessous
// (ex: import { campayProvider } from "./campay") et réexporte-le.
import { fapshiProvider } from "./fapshi";
import type { PaymentProvider } from "./types";

export const paymentProvider: PaymentProvider = fapshiProvider;
export * from "./types";
