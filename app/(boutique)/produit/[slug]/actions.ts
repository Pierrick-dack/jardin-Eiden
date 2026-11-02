"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderItems, orders, products, productViews, reviews } from "@/lib/db/schema";
import { ensureVisitorId } from "@/lib/visitor";
import { getSessionCustomer } from "@/lib/customer-auth";
import { notify } from "@/lib/notifications";

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce
    .number()
    .int()
    .min(1, "Choisis une note de 1 à 5 étoiles")
    .max(5, "Choisis une note de 1 à 5 étoiles"),
  title: z.string().trim().min(3, "Donne un titre à ton avis").max(100),
  comment: z
    .string()
    .trim()
    .min(10, "Ton avis doit faire au moins 10 caractères")
    .max(1000, "Ton avis ne doit pas dépasser 1000 caractères"),
});

export type ReviewState = { ok?: boolean; verified?: boolean; error?: string };

/**
 * Le client a-t-il une commande payée/expédiée/livrée contenant ce produit ?
 * Commandes de son compte, ou passées avant les comptes avec le même téléphone.
 */
async function hasPurchased(productId: string, customerId: string, phone: string) {
  const rows = await db
    .select({ customerId: orders.customerId, phone: orders.customerPhone })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.productId, productId),
        inArray(orders.status, ["PAYEE", "EXPEDIEE", "LIVREE"])
      )
    );
  return rows.some((r) => r.customerId === customerId || (!r.customerId && r.phone === phone));
}

export async function submitReview(
  _prev: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  // Champ piège invisible : rempli uniquement par les robots
  if (formData.get("website")) return { ok: true };

  // Compte obligatoire pour publier un avis
  const customer = await getSessionCustomer();
  if (!customer) return { error: "Connecte-toi pour laisser un avis." };

  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating") ?? 0,
    title: formData.get("title"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;

  const product = await db.query.products.findFirst({
    where: eq(products.id, data.productId),
    columns: { id: true },
  });
  if (!product) return { error: "Produit introuvable" };

  const isVerified = await hasPurchased(data.productId, customer.id, customer.phone);
  // Nom affiché : « Prénom N. » (le nom complet reste privé)
  const authorName = `${customer.firstName} ${customer.lastName.charAt(0).toUpperCase()}.`;

  const inserted = await db
    .insert(reviews)
    .values({ ...data, customerId: customer.id, authorName, isVerified })
    .onConflictDoNothing({ target: [reviews.customerId, reviews.productId] })
    .returning({ id: reviews.id });
  if (!inserted.length) return { error: "Tu as déjà donné ton avis sur ce produit." };

  await notify({ audience: "ADMIN" }, {
    title: `⭐ Nouvel avis (${data.rating}/5)`,
    body: `${authorName} : « ${data.title} »`,
    href: "/admin/avis",
  });
  refresh();
  return { ok: true, verified: isVerified };
}

/** « Utile » : +1 (le navigateur empêche de voter deux fois) */
export async function markReviewHelpful(reviewId: string) {
  await db
    .update(reviews)
    .set({ helpfulCount: sql`${reviews.helpfulCount} + 1` })
    .where(eq(reviews.id, reviewId));
  refresh();
}

/** « Signaler » : compté pour la modération dans l'admin */
export async function reportReview(reviewId: string) {
  await db
    .update(reviews)
    .set({ reportCount: sql`${reviews.reportCount} + 1` })
    .where(eq(reviews.id, reviewId));
}

/** Compte une consultation de la fiche et l'ajoute à l'historique du visiteur */
export async function recordProductView(productId: string) {
  const visitorId = await ensureVisitorId();
  const updated = await db
    .update(products)
    .set({ viewCount: sql`${products.viewCount} + 1` })
    .where(eq(products.id, productId))
    .returning({ id: products.id });
  if (updated.length) await db.insert(productViews).values({ visitorId, productId });
}
