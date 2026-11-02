"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audienceEnum, mediaFiles, products, productImages } from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { mediaIdFromUrl, PHOTO_MAX_BYTES, purgeOrphanMedia, saveProductPhoto } from "@/lib/media";
import { isSupportedVideoUrl } from "@/lib/video";

const url = z
  .string()
  .trim()
  .refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), "Adresse de média invalide (commence par / ou https://)");

const productSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(160),
  description: z.string().trim().min(5, "Description trop courte").max(4000),
  price: z.coerce.number().int().min(100, "Prix minimum 100 FCFA"),
  stock: z.coerce.number().int().min(0),
  audience: z.enum(audienceEnum.enumValues),
  categoryId: z.string().optional(),
  images: z.array(url).max(12, "12 photos maximum"),
  videoUrl: z
    .string()
    .trim()
    .refine(isSupportedVideoUrl, "Vidéo : colle un lien YouTube ou l'adresse d'un fichier MP4 / WebM")
    .optional(),
  isFeatured: z.boolean().optional(),
});

export type ProductFormState = { error?: string };

function parseForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    audience: formData.get("audience"),
    categoryId: formData.get("categoryId") || undefined,
    images: String(formData.get("images") ?? "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean),
    videoUrl: String(formData.get("videoUrl") ?? "").trim() || undefined,
    isFeatured: formData.get("isFeatured") === "on",
  });
}

/** Remplace les médias : 1re photo (vignette), puis la vidéo, puis les autres photos */
async function setMedia(productId: string, images: string[], videoUrl: string | undefined, alt: string) {
  const before = await db.select({ url: productImages.url }).from(productImages).where(eq(productImages.productId, productId));
  await db.delete(productImages).where(eq(productImages.productId, productId));
  const rows: (typeof productImages.$inferInsert)[] = images.map((u) => ({ productId, url: u, kind: "image", alt }));
  if (videoUrl) rows.splice(rows.length ? 1 : 0, 0, { productId, url: videoUrl, kind: "video", poster: images[0] ?? null, alt });
  if (rows.length) await db.insert(productImages).values(rows.map((r, position) => ({ ...r, position })));
  // Photos retirées du produit : supprimées de la base
  const removed = before.map((b) => mediaIdFromUrl(b.url)).filter((id): id is string => !!id && !images.includes(`/media/${id}`));
  if (removed.length) await db.delete(mediaFiles).where(inArray(mediaFiles.id, removed));
}

function refreshCatalog(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/produit/${slug}`);
}

/** Reçoit une photo déjà redimensionnée par le navigateur et l'enregistre en base */
export async function uploadProductPhoto(formData: FormData): Promise<{ url: string } | { error: string }> {
  await requireAdmin();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucune photo reçue." };
  if (file.type !== "image/jpeg") return { error: "Format inattendu (JPEG attendu)." };
  if (file.size > PHOTO_MAX_BYTES) return { error: "Photo trop lourde (3 Mo maximum)." };
  try {
    const url = await saveProductPhoto(Buffer.from(await file.arrayBuffer()));
    // Ménage des envois abandonnés (sans bloquer la réponse en cas d'échec)
    purgeOrphanMedia().catch((e) => console.error("[media] purge :", e));
    return { url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Envoi impossible." };
  }
}

/** Crée le produit en brouillon (hors boutique) puis ouvre son aperçu */
export async function createProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const d = parsed.data;

  // slug unique
  let slug = slugify(d.name);
  const existing = await db.query.products.findFirst({ where: eq(products.slug, slug) });
  if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const [row] = await db
    .insert(products)
    .values({
      name: d.name,
      slug,
      description: d.description,
      price: d.price,
      stock: d.stock,
      audience: d.audience,
      categoryId: d.categoryId || null,
      isActive: false,
      isFeatured: d.isFeatured ?? false,
    })
    .returning();

  await setMedia(row.id, d.images, d.videoUrl, d.name);
  revalidatePath("/admin", "layout");
  redirect(`/admin/produits/${row.id}/apercu?cree=1`);
}

/** Enregistre les modifications ; la mise en boutique (ou non) reste inchangée */
export async function updateProduct(id: string, _prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const d = parsed.data;

  const [row] = await db
    .update(products)
    .set({
      name: d.name,
      description: d.description,
      price: d.price,
      stock: d.stock,
      audience: d.audience,
      categoryId: d.categoryId || null,
      isFeatured: d.isFeatured ?? false,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning({ slug: products.slug });
  if (!row) return { error: "Produit introuvable." };

  await setMedia(id, d.images, d.videoUrl, d.name);
  refreshCatalog(row.slug);
  redirect(`/admin/produits/${id}/apercu?modifie=1`);
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const media = await db.select({ url: productImages.url }).from(productImages).where(eq(productImages.productId, id));
  // Les commandes passées gardent le nom et le prix (copiés dans la commande)
  await db.delete(products).where(eq(products.id, id));
  const ids = media.map((m) => mediaIdFromUrl(m.url)).filter((x): x is string => !!x);
  if (ids.length) await db.delete(mediaFiles).where(inArray(mediaFiles.id, ids));
  refreshCatalog();
}

/**
 * Met un produit en boutique (publication) ou l'en retire (masqué).
 * Un produit sans photo ne peut pas être publié.
 */
export async function setProductOnline(id: string, online: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  if (online) {
    const photo = await db.query.productImages.findFirst({
      where: and(eq(productImages.productId, id), eq(productImages.kind, "image")),
    });
    if (!photo) return { error: "Ajoute au moins une photo avant de publier ce produit." };
  }
  const [row] = await db
    .update(products)
    .set({
      isActive: online,
      ...(online && { publishedAt: sql`coalesce(${products.publishedAt}, now())` }),
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning({ slug: products.slug });
  refreshCatalog(row?.slug);
  return {};
}

/** Modification rapide du stock depuis la liste (réassort, inventaire) */
export async function updateStock(id: string, stock: number) {
  await requireAdmin();
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) throw new Error("Stock invalide");
  await db.update(products).set({ stock, updatedAt: new Date() }).where(eq(products.id, id));
  refreshCatalog();
}
