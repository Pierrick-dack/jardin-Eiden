// Réponse HTTP « téléchargement de facture » commune au compte client et à l'admin
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { orders } from "./db/schema";
import { buildInvoicePdf, invoiceFileName, isOrderPaid } from "./invoice";

/** `customerId` : restreint aux commandes de ce client (null = admin, toutes) */
export async function invoiceResponse(orderId: string, customerId: string | null) {
  const order = await db.query.orders.findFirst({
    where: customerId ? and(eq(orders.id, orderId), eq(orders.customerId, customerId)) : eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order) return new Response("Commande introuvable", { status: 404 });
  if (!isOrderPaid(order)) {
    return new Response("La facture sera disponible une fois la commande payée.", { status: 409 });
  }
  const pdf = await buildInvoicePdf(order);
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${invoiceFileName(order)}"`,
      "cache-control": "private, no-store",
    },
  });
}
