// Logique métier commandes : création, confirmation de paiement, stock.
import { db } from "./db";
import { orders, orderItems, orderEvents, products } from "./db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { normalizeCameroonPhone } from "./utils";
import { afterResponse } from "./after-response";
import { notifyOrderReceived, recordOrderEvent } from "./order-lifecycle";
import { sendOrderEmail } from "./order-emails";

export type CheckoutItemInput = { productId: string; quantity: number };

export type CheckoutCustomerInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryCity: string;
  deliveryAddress: string;
  deliveryNote?: string;
  visitorId?: string;
  customerId?: string;
};

/** Génère une référence lisible : EID-2026-XXXX */
async function generateReference(): Promise<string> {
  const year = 2026;
  // Compte des commandes existantes pour un numéro séquentiel simple
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders);
  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `EID-${year}-${seq}`;
}

/**
 * Crée une commande à partir du panier.
 * ⚠️ Recalcule TOUT côté serveur depuis la base — ne fait jamais confiance aux
 * prix/quantités envoyés par le client. Vérifie le stock disponible.
 */
export async function createOrder(
  customer: CheckoutCustomerInput,
  cart: CheckoutItemInput[]
): Promise<
  | { ok: true; orderId: string; reference: string; total: number }
  | { ok: false; error: string }
> {
  if (!cart.length) return { ok: false, error: "Le panier est vide." };

  const ids = cart.map((c) => c.productId);
  const dbProducts = await db
    .select()
    .from(products)
    .where(inArray(products.id, ids));

  const byId = new Map(dbProducts.map((p) => [p.id, p]));

  let subtotal = 0;
  const itemsToInsert: {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[] = [];

  for (const line of cart) {
    const p = byId.get(line.productId);
    if (!p || !p.isActive) {
      return { ok: false, error: `Un produit n'est plus disponible.` };
    }
    const qty = Math.max(1, Math.floor(line.quantity));
    if (qty > p.stock) {
      return {
        ok: false,
        error: `Stock insuffisant pour « ${p.name} » (${p.stock} disponible${p.stock > 1 ? "s" : ""}).`,
      };
    }
    const lineTotal = p.price * qty;
    subtotal += lineTotal;
    itemsToInsert.push({
      productId: p.id,
      productName: p.name,
      unitPrice: p.price,
      quantity: qty,
      lineTotal,
    });
  }

  const deliveryFee = 0; // frais fixés avec le client lors de la confirmation WhatsApp
  const total = subtotal + deliveryFee;
  const reference = await generateReference();

  const [order] = await db
    .insert(orders)
    .values({
      reference,
      customerName: customer.customerName.trim(),
      customerPhone: normalizeCameroonPhone(customer.customerPhone),
      customerEmail: customer.customerEmail?.trim() || null,
      deliveryCity: customer.deliveryCity.trim(),
      deliveryAddress: customer.deliveryAddress.trim(),
      deliveryNote: customer.deliveryNote?.trim() || null,
      visitorId: customer.visitorId ?? null,
      customerId: customer.customerId ?? null,
      subtotal,
      deliveryFee,
      total,
      status: "EN_ATTENTE",
      payment: "EN_ATTENTE",
    })
    .returning();

  await db.insert(orderItems).values(
    itemsToInsert.map((it) => ({ ...it, orderId: order.id }))
  );
  // 1re étape du suivi (sans notification : l'équipe est prévenue au paiement
  // ou à la réception, selon le mode)
  await db.insert(orderEvents).values({ orderId: order.id, type: "CREEE" });

  return { ok: true, orderId: order.id, reference, total };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type OrderWithLines = { id: string; stockDecrementedAt: Date | null; items: { productId: string | null; quantity: number }[] };

/** Retire du stock les articles de la commande, une seule fois (stockDecrementedAt) */
async function takeStock(tx: Tx, order: OrderWithLines) {
  if (order.stockDecrementedAt) return;
  for (const it of order.items) {
    if (it.productId) {
      await tx
        .update(products)
        .set({ stock: sql`GREATEST(0, ${products.stock} - ${it.quantity})` })
        .where(eq(products.id, it.productId));
    }
  }
  await tx.update(orders).set({ stockDecrementedAt: new Date() }).where(eq(orders.id, order.id));
}

/** Remet en stock les articles d'une commande annulée / remboursée */
async function restoreStock(tx: Tx, order: OrderWithLines) {
  if (!order.stockDecrementedAt) return;
  for (const it of order.items) {
    if (it.productId) {
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} + ${it.quantity}` })
        .where(eq(products.id, it.productId));
    }
  }
  await tx.update(orders).set({ stockDecrementedAt: null }).where(eq(orders.id, order.id));
}

/**
 * Confirme le paiement d'une commande (appelé depuis le webhook ou le polling).
 * Idempotent : ne décrémente le stock qu'une seule fois.
 */
export async function confirmPayment(opts: {
  reference?: string;
  transactionId: string;
  paymentMethod?: string;
}): Promise<{ ok: boolean; alreadyDone?: boolean }> {
  // Retrouve la commande par référence (externalId) ou par transId stocké
  const order = opts.reference
    ? await db.query.orders.findFirst({
        where: eq(orders.reference, opts.reference),
        with: { items: true },
      })
    : await db.query.orders.findFirst({
        where: eq(orders.paymentRef, opts.transactionId),
        with: { items: true },
      });

  if (!order) return { ok: false };

  // Idempotence : déjà payée → ne rien refaire (l'email, lui, n'est envoyé
  // qu'une fois : relancer ici rattrape un envoi précédent qui aurait échoué)
  if (order.payment === "REUSSI") {
    afterResponse(() => sendOrderEmail(order.id, "paid"));
    return { ok: true, alreadyDone: true };
  }

  // Transaction : marque payée + décrémente le stock
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        payment: "REUSSI",
        status: "PAYEE",
        paymentRef: opts.transactionId,
        paymentMethod: opts.paymentMethod ?? order.paymentMethod,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    await takeStock(tx, order);
  });

  // Suivi + notification à l'équipe (nouvelle commande payée) et au client
  await recordOrderEvent(order.id, "PAYEE", "client");
  // Confirmation de paiement + facture, envoyée après la réponse
  afterResponse(() => sendOrderEmail(order.id, "paid"));
  return { ok: true };
}

/**
 * Mode SANS paiement en ligne : la commande reste « en attente » de validation
 * par l'équipe (qui l'encaisse puis la prépare) ; le stock est réservé.
 * Idempotent : ne réserve le stock et ne notifie qu'une fois.
 */
export async function receiveOrderWithoutPayment(
  orderId: string
): Promise<{ ok: boolean; alreadyDone?: boolean }> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order) return { ok: false };

  // Déjà reçue (stock déjà réservé) → ne rien refaire
  if (order.stockDecrementedAt || order.status !== "EN_ATTENTE") {
    return { ok: true, alreadyDone: true };
  }

  await db.transaction(async (tx) => {
    await takeStock(tx, order);
  });

  // L'équipe est notifiée de la nouvelle commande ; le client reçoit le
  // récapitulatif « commande reçue » (la facture suivra une fois payée)
  await notifyOrderReceived(order.id);
  afterResponse(() => sendOrderEmail(order.id, "received"));
  return { ok: true };
}

/** Moyens d'encaissement proposés à l'admin */
export const PAYMENT_METHODS = {
  MTN_MOMO: "MTN Mobile Money",
  ORANGE_MONEY: "Orange Money",
  ESPECES: "Espèces (à la livraison)",
  VIREMENT: "Virement / autre",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

/**
 * Encaissement manuel par l'admin (paiement reçu hors du site : Mobile Money
 * sur WhatsApp, espèces à la livraison…). Retire le stock si ce n'est pas déjà
 * fait et envoie la confirmation + facture au client.
 */
export async function recordManualPayment(orderId: string, method: PaymentMethod, reference?: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: true } });
  if (!order) return { ok: false as const, error: "Commande introuvable" };
  if (order.status === "ANNULEE") return { ok: false as const, error: "Commande annulée : impossible de l'encaisser." };
  if (order.payment === "REUSSI") return { ok: false as const, error: "Commande déjà encaissée." };

  // Encaissée par l'équipe = validée : elle passe directement en préparation
  // (une commande déjà expédiée / livrée garde son statut de livraison)
  const toPreparation = ["EN_ATTENTE", "PAYEE"].includes(order.status);
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        payment: "REUSSI",
        ...(toPreparation && { status: "EN_PREPARATION" as const }),
        paymentMethod: method,
        paymentRef: reference?.trim() || order.paymentRef || `MANUEL-${order.reference}`,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    await takeStock(tx, order);
  });
  await recordOrderEvent(order.id, "PAYEE", "admin");
  if (toPreparation) await recordOrderEvent(order.id, "EN_PREPARATION", "admin");
  afterResponse(() => sendOrderEmail(order.id, "paid"));
  return { ok: true as const };
}

/**
 * Annule une commande (et la marque remboursée si elle avait été encaissée).
 * Les articles sont remis en stock.
 */
export async function cancelOrder(orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: true } });
  if (!order) return { ok: false as const, error: "Commande introuvable" };
  if (order.status === "ANNULEE") return { ok: false as const, error: "Commande déjà annulée." };
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: "ANNULEE",
        ...(order.payment === "REUSSI" && { payment: "REMBOURSE" as const }),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    await restoreStock(tx, order);
  });
  // Suivi + notification + email d'annulation au client
  await recordOrderEvent(order.id, "ANNULEE");
  return { ok: true as const, refunded: order.payment === "REUSSI" };
}

/** Stocke la référence de transaction après initiation du paiement */
export async function setOrderPaymentRef(
  orderId: string,
  transactionId: string,
  paymentMethod?: string
) {
  await db
    .update(orders)
    .set({ paymentRef: transactionId, paymentMethod, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
}

export async function getOrderById(id: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true },
  });
}

export async function getOrderByReference(reference: string) {
  return db.query.orders.findFirst({
    where: eq(orders.reference, reference),
    with: { items: true },
  });
}
