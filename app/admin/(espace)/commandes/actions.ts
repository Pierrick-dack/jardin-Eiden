"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cancelOrder, PAYMENT_METHODS, recordManualPayment, type PaymentMethod } from "@/lib/orders";
import { recordOrderEvent } from "@/lib/order-lifecycle";

// Étapes de livraison réglables à la main (l'encaissement et l'annulation
// ont leurs propres actions : ils touchent à l'argent et au stock)
const DELIVERY_STEPS = ["EN_PREPARATION", "EXPEDIEE", "LIVREE"] as const;
type DeliveryStep = (typeof DELIVERY_STEPS)[number];

export type AdminActionState = { ok?: boolean; message?: string; error?: string };

function refreshOrders(id?: string) {
  revalidatePath("/admin", "layout");
  if (id) revalidatePath(`/admin/commandes/${id}`);
}

export async function updateOrderStatus(id: string, status: string) {
  await requireAdmin();
  if (!DELIVERY_STEPS.includes(status as DeliveryStep)) throw new Error("Statut invalide");
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id), columns: { status: true } });
  if (!order || order.status === "ANNULEE") throw new Error("Commande annulée ou introuvable");
  if (order.status === status) return;
  await db
    .update(orders)
    .set({ status: status as DeliveryStep, updatedAt: new Date() })
    .where(eq(orders.id, id));
  // Suivi du client mis à jour + notification + email (expédiée, livrée)
  await recordOrderEvent(id, status as DeliveryStep);
  refreshOrders(id);
}

/** Enregistre un paiement reçu hors du site (Mobile Money, espèces…) */
export async function recordPaymentAction(id: string, _prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const method = String(formData.get("method") ?? "");
  if (!Object.hasOwn(PAYMENT_METHODS, method)) return { error: "Choisis le moyen de paiement." };
  const res = await recordManualPayment(id, method as PaymentMethod, String(formData.get("reference") ?? ""));
  if (!res.ok) return { error: res.error };
  refreshOrders(id);
  return { ok: true, message: "Paiement encaissé : commande passée en préparation. La facture est envoyée au client par email." };
}

export async function cancelOrderAction(id: string): Promise<AdminActionState> {
  await requireAdmin();
  const res = await cancelOrder(id);
  if (!res.ok) return { error: res.error };
  refreshOrders(id);
  return {
    ok: true,
    message: res.refunded
      ? "Commande annulée et marquée remboursée. Les articles sont remis en stock."
      : "Commande annulée. Les articles sont remis en stock.",
  };
}
