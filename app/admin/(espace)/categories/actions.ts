"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export type CategoryState = { ok?: boolean; error?: string };

const nameSchema = z.string().trim().min(2, "Nom trop court").max(60, "Nom trop long");

function refreshCatalog() {
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
}

export async function createCategory(_prev: CategoryState, formData: FormData): Promise<CategoryState> {
  await requireAdmin();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const slug = slugify(parsed.data);
  if (await db.query.categories.findFirst({ where: eq(categories.slug, slug) })) {
    return { error: "Cette catégorie existe déjà." };
  }
  await db.insert(categories).values({ name: parsed.data, slug });
  refreshCatalog();
  return { ok: true };
}

/** Renomme (le lien /categorie/<slug> reste inchangé pour ne pas casser les liens partagés) */
export async function renameCategory(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  await db.update(categories).set({ name: parsed.data }).where(eq(categories.id, id));
  refreshCatalog();
}

/** Supprime la catégorie ; ses produits restent en ligne, sans catégorie */
export async function deleteCategory(id: string) {
  await requireAdmin();
  await db.delete(categories).where(eq(categories.id, id));
  refreshCatalog();
}
