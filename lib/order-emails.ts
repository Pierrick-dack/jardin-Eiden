// Emails de commande envoyés au client, une seule fois chacun :
// - paiement confirmé → récapitulatif + facture PDF jointe
// - commande reçue (mode sans paiement en ligne) → récapitulatif
// Un échec d'envoi n'interrompt jamais le traitement de la commande.
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { orders } from "./db/schema";
import { sendEmail } from "./email";
import { orderEmailTemplate } from "./email-templates";
import { buildInvoicePdf, invoiceFileName, isOrderPaid, paymentLabel } from "./invoice";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function sendOrderEmail(orderId: string, kind: "paid" | "received") {
  try {
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: true } });
    if (!order?.customerEmail) return;
    if (kind === "paid" && !isOrderPaid(order)) return;

    // Réserve l'envoi (évite les doublons si webhook et page de suivi confirment en même temps)
    const flag = kind === "paid" ? orders.invoiceEmailSentAt : orders.confirmationEmailSentAt;
    const claimed = await db
      .update(orders)
      .set(kind === "paid" ? { invoiceEmailSentAt: new Date() } : { confirmationEmailSentAt: new Date() })
      .where(and(eq(orders.id, orderId), isNull(flag)))
      .returning({ id: orders.id });
    if (!claimed.length) return; // déjà envoyé

    const links = {
      account: `${siteUrl()}/compte`,
      tracking: `${siteUrl()}/commande/${order.id}`,
      paymentLabel: kind === "paid" ? paymentLabel(order) : undefined,
      invoiceName: kind === "paid" ? invoiceFileName(order) : undefined,
    };
    const email = orderEmailTemplate({ ...order, customerEmail: order.customerEmail }, kind, links);
    if (kind === "paid") {
      email.attachments = [{ name: invoiceFileName(order), content: await buildInvoicePdf(order) }];
    }

    const sent = await sendEmail(email);
    if (!sent.ok) {
      // Libère la réservation pour qu'un prochain déclenchement réessaie
      await db
        .update(orders)
        .set(kind === "paid" ? { invoiceEmailSentAt: null } : { confirmationEmailSentAt: null })
        .where(eq(orders.id, orderId));
    }
  } catch (e) {
    console.error(`[email] commande ${orderId} (${kind}) :`, e);
  }
}
