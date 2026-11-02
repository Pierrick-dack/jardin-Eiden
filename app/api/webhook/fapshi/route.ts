// Webhook Fapshi : appelé par Fapshi quand le statut d'un paiement change.
// Confirme la commande (idempotent), décrémente le stock, prépare WhatsApp.
import { NextResponse } from "next/server";
import { paymentProvider } from "@/lib/payment";
import { confirmPayment, getOrderByReference } from "@/lib/orders";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => (headers[k] = v));

  const parsed = await paymentProvider.parseWebhook(body, headers);
  if (!parsed) {
    return NextResponse.json({ error: "Webhook non vérifié" }, { status: 401 });
  }

  if (parsed.status === "SUCCESS") {
    const result = await confirmPayment({
      reference: parsed.reference,
      transactionId: parsed.transactionId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    // La notification WhatsApp est déclenchée côté page commande (lien pré-rempli).
    // On marque juste la commande comme prête à être transmise.
    if (parsed.reference) {
      await getOrderByReference(parsed.reference); // (hook d'extension possible)
    }
  }

  // Toujours répondre 200 rapidement pour éviter les relances.
  return NextResponse.json({ received: true });
}
