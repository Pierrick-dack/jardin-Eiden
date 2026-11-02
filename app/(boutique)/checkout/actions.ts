"use server";

import { z } from "zod";
import {
  createOrder,
  setOrderPaymentRef,
  receiveOrderWithoutPayment,
} from "@/lib/orders";
import { paymentProvider } from "@/lib/payment";
import { paymentsEnabled } from "@/lib/config";
import { ensureVisitorId } from "@/lib/visitor";
import { getSessionCustomer } from "@/lib/customer-auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customerAddresses } from "@/lib/db/schema";

const checkoutSchema = z.object({
  // Adresse du carnet du client (destinataire, téléphone, lieu de livraison)
  addressId: z.string().min(1, "Choisis une adresse de livraison"),
  deliveryNote: z.string().max(400).optional(),
  cart: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Panier vide"),
});

export type CheckoutResult =
  | {
      ok: true;
      // "pay"   : rediriger vers paymentUrl (paiement en ligne)
      // "nopay" : rediriger vers la page de suivi de commande
      mode: "pay" | "nopay";
      paymentUrl: string | null;
      reference: string;
      orderId: string;
    }
  | { ok: false; error: string };

export async function submitCheckout(input: unknown): Promise<CheckoutResult> {
  // Compte obligatoire : l'email du compte reçoit confirmation et facture
  const customer = await getSessionCustomer();
  if (!customer) return { ok: false, error: "Ta session a expiré. Reconnecte-toi pour finaliser ta commande." };
  if (!customer.emailVerifiedAt) {
    return { ok: false, error: "Confirme d'abord ton adresse email (lien reçu par email) pour passer commande." };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Données invalides";
    return { ok: false, error: first };
  }
  const data = parsed.data;

  const address = await db.query.customerAddresses.findFirst({
    where: and(eq(customerAddresses.id, data.addressId), eq(customerAddresses.customerId, customer.id)),
  });
  if (!address) return { ok: false, error: "Adresse de livraison introuvable. Choisis-en une autre." };

  // 1) Créer la commande (recalcul serveur + vérif stock). L'adresse est
  //    recopiée dans la commande : la modifier plus tard ne change pas l'historique.
  const created = await createOrder(
    {
      customerName: address.fullName,
      customerPhone: address.phone,
      customerEmail: customer.email,
      customerId: customer.id,
      deliveryCity: address.city,
      deliveryAddress: address.landmark ? `${address.address} (repère : ${address.landmark})` : address.address,
      deliveryNote: data.deliveryNote,
      visitorId: await ensureVisitorId(),
    },
    data.cart
  );
  if (!created.ok) return { ok: false, error: created.error };

  // 2a) Mode SANS paiement en ligne : on enregistre la commande et on envoie
  //     directement vers la page de suivi (qui propose le bouton WhatsApp).
  if (!paymentsEnabled) {
    await receiveOrderWithoutPayment(created.orderId);
    return {
      ok: true,
      mode: "nopay",
      paymentUrl: null,
      reference: created.reference,
      orderId: created.orderId,
    };
  }

  // 2b) Mode AVEC paiement : initier le paiement Mobile Money
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const payment = await paymentProvider.initiate({
      amount: created.total,
      phone: address.phone,
      reference: created.reference,
      description: `Commande ${created.reference} — Le Jardin d'Eïden`,
      customerName: address.fullName,
      email: customer.email,
      redirectUrl: `${siteUrl}/commande/${created.orderId}`,
    });

    await setOrderPaymentRef(created.orderId, payment.transactionId);

    if (!payment.paymentUrl) {
      return {
        ok: false,
        error:
          "Le prestataire de paiement n'a pas renvoyé de lien. Réessaie dans un instant.",
      };
    }

    return {
      ok: true,
      mode: "pay",
      paymentUrl: payment.paymentUrl,
      reference: created.reference,
      orderId: created.orderId,
    };
  } catch (e) {
    console.error("Erreur initiation paiement :", e);
    return {
      ok: false,
      error:
        "Impossible d'initier le paiement Mobile Money pour le moment. Vérifie tes identifiants Fapshi ou réessaie.",
    };
  }
}
