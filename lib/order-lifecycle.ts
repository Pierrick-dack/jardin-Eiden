// Étapes d'une commande : chaque changement est daté (suivi client),
// notifie l'équipe et/ou le client, et prévient le client par email quand
// la commande est expédiée, livrée ou annulée.
import { eq } from "drizzle-orm";
import { db } from "./db";
import { orderEvents, orders, type OrderEventType } from "./db/schema";
import { notify } from "./notifications";
import { sendEmail } from "./email";
import { orderStatusEmailTemplate } from "./email-templates";
import { afterResponse } from "./after-response";
import { formatPrice } from "./utils";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Enregistre une étape de la commande.
 * `by` : "client" (paiement en ligne, commande passée) ou "admin" (action de
 * l'équipe : inutile de lui notifier ce qu'elle vient de faire).
 */
export async function recordOrderEvent(orderId: string, type: OrderEventType, by: "client" | "admin" = "admin") {
  try {
    await db.insert(orderEvents).values({ orderId, type });
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) return;

    const ref = order.reference;
    const adminHref = `/admin/commandes/${order.id}`;
    const clientHref = `/compte?suivi=${order.id}`;
    const forClient = (title: string, body: string) =>
      order.customerId ? notify({ audience: "CLIENT", customerId: order.customerId }, { title, body, href: clientHref }) : null;

    switch (type) {
      case "CREEE":
        break;
      case "PAYEE":
        if (by === "client") {
          await notify({ audience: "ADMIN" }, {
            title: `💰 Nouvelle commande payée ${ref}`,
            body: `${order.customerName} · ${formatPrice(order.total)} · à préparer`,
            href: adminHref,
          });
        }
        await forClient("Paiement confirmé ✓", `Ta commande ${ref} est payée. Ta facture t'a été envoyée par email.`);
        break;
      case "EN_PREPARATION":
        await forClient("Commande en préparation", `Nous préparons ta commande ${ref} avec soin.`);
        break;
      case "EXPEDIEE":
        await forClient("Commande expédiée 🚚", `Ta commande ${ref} est en route vers ${order.deliveryCity}.`);
        break;
      case "LIVREE":
        await forClient("Commande livrée 🌿", `Ta commande ${ref} a été livrée. Merci pour ta confiance !`);
        break;
      case "ANNULEE":
        await forClient("Commande annulée", `Ta commande ${ref} a été annulée.`);
        break;
    }

    // Email au client pour les étapes de livraison et l'annulation
    if ((type === "EXPEDIEE" || type === "LIVREE" || type === "ANNULEE") && order.customerEmail) {
      const email = orderStatusEmailTemplate(
        { ...order, customerEmail: order.customerEmail },
        type,
        { tracking: `${siteUrl()}${clientHref}`, refunded: order.payment === "REMBOURSE" }
      );
      afterResponse(() => sendEmail(email));
    }
  } catch (e) {
    console.error(`[commande ${orderId}] étape ${type} :`, e);
  }
}

/** Commande passée sans paiement en ligne : l'équipe doit la valider et l'encaisser */
export async function notifyOrderReceived(orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return;
  await notify({ audience: "ADMIN" }, {
    title: `🧾 Nouvelle commande ${order.reference}`,
    body: `${order.customerName} · ${formatPrice(order.total)} · à valider et encaisser`,
    href: `/admin/commandes/${order.id}`,
  });
  if (order.customerId) {
    await notify({ audience: "CLIENT", customerId: order.customerId }, {
      title: "Commande enregistrée",
      body: `Ta commande ${order.reference} est bien reçue. Notre équipe la valide au plus vite.`,
      href: `/compte?suivi=${order.id}`,
    });
  }
}
