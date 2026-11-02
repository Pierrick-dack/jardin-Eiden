// Interface commune à tout agrégateur Mobile Money.
// Permet de changer de prestataire (Fapshi, Campay, Notch Pay...) sans toucher
// au reste de l'application.

export type InitiatePaymentInput = {
  amount: number; // FCFA
  phone: string; // numéro MoMo au format international sans +
  reference: string; // référence interne de la commande (EID-...)
  description: string;
  customerName: string;
  email?: string;
  redirectUrl?: string; // page de retour après paiement
};

export type InitiatePaymentResult = {
  // Identifiant de la transaction côté agrégateur
  transactionId: string;
  // URL de paiement à ouvrir (si le prestataire fournit une page hébergée)
  paymentUrl?: string;
  // Statut initial
  status: "PENDING" | "SUCCESS" | "FAILED";
  raw?: unknown;
};

export type PaymentStatusResult = {
  status: "PENDING" | "SUCCESS" | "FAILED";
  transactionId: string;
  raw?: unknown;
};

export interface PaymentProvider {
  name: string;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  getStatus(transactionId: string): Promise<PaymentStatusResult>;
  /** Vérifie et interprète un payload de webhook. Retourne null si invalide. */
  parseWebhook(
    body: unknown,
    headers: Record<string, string>
  ): Promise<{ transactionId: string; reference?: string; status: "PENDING" | "SUCCESS" | "FAILED" } | null>;
}
