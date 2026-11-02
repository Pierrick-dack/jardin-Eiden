"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

function refresh() {
  revalidatePath("/admin/avis");
  revalidatePath("/produit/[slug]", "page");
}

/** Masquer / republier un avis (il reste en base) */
export async function setReviewPublished(id: string, published: boolean) {
  await requireAdmin();
  // Republier = l'avis a été examiné : on remet les signalements à zéro
  await db
    .update(reviews)
    .set(published ? { isPublished: true, reportCount: 0 } : { isPublished: false })
    .where(eq(reviews.id, id));
  refresh();
}

export async function deleteReview(id: string) {
  await requireAdmin();
  await db.delete(reviews).where(eq(reviews.id, id));
  refresh();
}
