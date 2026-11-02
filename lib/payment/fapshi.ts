// Adaptateur Fapshi (Mobile Money Cameroun — MTN MoMo & Orange Money)
// Docs : https://docs.fapshi.com
import type {
  PaymentProvider,
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentStatusResult,
} from "./types";

const BASE =
  process.env.FAPSHI_ENV === "live"
    ? "https://live.fapshi.com"
    : "https://sandbox.fapshi.com";

function headers() {
  const apiuser = process.env.FAPSHI_API_USER;
  const apikey = process.env.FAPSHI_API_KEY;
  if (!apiuser || !apikey) {
    throw new Error(
      "FAPSHI_API_USER / FAPSHI_API_KEY manquants dans l'environnement."
    );
  }
  return {
    "Content-Type": "application/json",
    apiuser,
    apikey,
  };
}

/** Mappe le statut Fapshi vers notre statut interne */
function mapStatus(s: string): "PENDING" | "SUCCESS" | "FAILED" {
  switch (s) {
    case "SUCCESSFUL":
      return "SUCCESS";
    case "FAILED":
    case "EXPIRED":
      return "FAILED";
    default:
      return "PENDING"; // CREATED, PENDING
  }
}

export const fapshiProvider: PaymentProvider = {
  name: "fapshi",

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const res = await fetch(`${BASE}/initiate-pay`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        amount: input.amount,
        email: input.email || undefined,
        redirectUrl: input.redirectUrl,
        externalId: input.reference, // réconciliation = notre référence commande
        message: input.description,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `Fapshi initiate-pay a échoué (${res.status}) : ${data?.message || "erreur inconnue"}`
      );
    }

    return {
      transactionId: data.transId,
      paymentUrl: data.link,
      status: "PENDING",
      raw: data,
    };
  },

  async getStatus(transactionId: string): Promise<PaymentStatusResult> {
    const res = await fetch(`${BASE}/payment-status/${transactionId}`, {
      method: "GET",
      headers: headers(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `Fapshi payment-status a échoué (${res.status}) : ${data?.message || "erreur inconnue"}`
      );
    }
    return {
      status: mapStatus(data.status),
      transactionId: data.transId ?? transactionId,
      raw: data,
    };
  },

  async parseWebhook(body: unknown, hdrs: Record<string, string>) {
    // Vérification du secret partagé (optionnel mais recommandé) : en-tête x-wh-secret
    const expected = process.env.FAPSHI_WEBHOOK_SECRET;
    if (expected) {
      const received = hdrs["x-wh-secret"];
      if (received !== expected) {
        return null; // non authentifié
      }
    }
    const b = body as Record<string, unknown>;
    if (!b || typeof b.transId !== "string" || typeof b.status !== "string") {
      return null;
    }
    return {
      transactionId: b.transId,
      reference: typeof b.externalId === "string" ? b.externalId : undefined,
      status: mapStatus(b.status),
    };
  },
};
