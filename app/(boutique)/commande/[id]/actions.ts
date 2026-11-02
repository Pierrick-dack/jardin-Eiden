"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { paymentProvider } from "@/lib/payment";
import { confirmPayment } from "@/lib/orders";
import { paymentsEnabled } from "@/lib/config";
import { getSessionCustomer } from "@/lib/customer-auth";
import { buildTracking, type TrackingView } from "@/lib/order-tracking";

export type OrderStatusView = {
  customerName: string;
  paid: boolean;
  /** Paiement en ligne lancé mais pas encore confirmé : la page revérifie */
  awaitingOnlinePayment: boolean;
  tracking: TrackingView;
};

const loadOrder = (id: string) =>
  db.query.orders.findFirst({ where: eq(orders.id, id), with: { items: true, events: true } });

/**
 * État de la commande pour la page de suivi. Si un paiement en ligne est en
 * cours, interroge l'agrégateur (filet de sécurité si le webhook n'est pas
 * encore passé) et confirme la commande. L'équipe est notifiée du paiement :
 * plus rien à envoyer sur WhatsApp côté client.
 */
export async function checkOrderStatus(orderId: string): Promise<OrderStatusView | { error: string }> {
  let order = await loadOrder(orderId);
  if (!order) return { error: "Commande introuvable." };
  // Une commande liée à un compte n'est visible que par son propriétaire
  if (order.customerId && order.customerId !== (await getSessionCustomer())?.id) {
    return { error: "Commande introuvable." };
  }

  if (paymentsEnabled && order.payment !== "REUSSI" && order.paymentRef && order.status !== "ANNULEE") {
    try {
      const status = await paymentProvider.getStatus(order.paymentRef);
      if (status.status === "SUCCESS") {
        await confirmPayment({ reference: order.reference, transactionId: order.paymentRef });
        order = (await loadOrder(orderId)) ?? order;
      }
    } catch (e) {
      console.error("Vérification statut paiement :", e);
    }
  }

  const paid = order.payment === "REUSSI";
  return {
    customerName: order.customerName,
    paid,
    awaitingOnlinePayment: paymentsEnabled && !paid && !!order.paymentRef && order.status !== "ANNULEE",
    tracking: buildTracking(order),
  };
}
