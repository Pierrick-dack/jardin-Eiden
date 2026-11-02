// Fonctions d'accès aux données produits/catégories.
// Pas de 'use cache' ici : le stock doit rester frais à chaque requête.
// Chaque lecture commence par `await connection()` : elle est faite à la requête,
// jamais pendant le prérendu (sinon Next.js signale « blocking-prerender »).
import { db } from "./db";
import {
  products,
  categories,
  productImages,
  reviews,
  orders,
  orderItems,
  productViews,
} from "./db/schema";
import { eq, ne, and, desc, asc, count, countDistinct, inArray, max } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { connection } from "next/server";
import type { Audience } from "./db/schema";
import { sameAudience } from "./audience";

// Seconde lecture des tables pour croiser une commande / un visiteur avec lui-même
const other = alias(orderItems, "other_items");
const otherView = alias(productViews, "other_views");

export type ProductWithImages = Awaited<
  ReturnType<typeof getProductBySlug>
>;

export type ProductSort = "populaires" | "nouveautes" | "prix-asc" | "prix-desc";

/** Minuscules sans accents : « Crème » et « creme » se valent */
const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const audienceWords: Record<Audience, string> = {
  HOMME: "homme lui masculin",
  FEMME: "femme elle feminin",
  UNISEXE: "mixte unisexe homme femme",
  FILLE: "fille fillette enfant",
  GARCON: "garcon enfant",
  ENFANT: "enfant enfants fille garcon bebe",
};

/**
 * Produits actifs, filtrables par catégorie, publics (voir genreAudiences)
 * et recherche texte, puis triés.
 * Filtrage en mémoire : suffisant pour un catalogue de quelques centaines d'articles.
 */
export async function getProducts(opts?: {
  categorySlug?: string;
  audiences?: Audience[];
  q?: string;
  sort?: ProductSort;
}) {
  await connection();
  const rows = await db.query.products.findMany({
    where: eq(products.isActive, true),
    with: {
      images: { orderBy: asc(productImages.position) },
      category: true,
    },
    orderBy: [desc(products.isFeatured), desc(products.createdAt)],
  });

  const words = normalize(opts?.q ?? "").split(/\s+/).filter((w) => w.length > 1);
  const scored = rows.flatMap((p) => {
    if (opts?.categorySlug && p.category?.slug !== opts.categorySlug) return [];
    if (opts?.audiences && !opts.audiences.includes(p.audience)) return [];
    if (!words.length) return [{ p, score: 0 }];

    const name = normalize(p.name);
    const haystack = normalize(
      `${p.name} ${p.description} ${p.category?.name ?? ""} ${audienceWords[p.audience]}`
    );
    if (!words.every((w) => haystack.includes(w))) return [];
    // Les mots trouvés dans le nom comptent davantage
    return [{ p, score: words.filter((w) => name.includes(w)).length }];
  });

  const sort = opts?.sort ?? "populaires";
  scored.sort((a, b) => {
    if (sort === "prix-asc") return a.p.price - b.p.price;
    if (sort === "prix-desc") return b.p.price - a.p.price;
    if (sort === "nouveautes") return b.p.createdAt.getTime() - a.p.createdAt.getTime();
    return (
      b.score - a.score ||
      Number(b.p.isFeatured) - Number(a.p.isFeatured) ||
      b.p.viewCount - a.p.viewCount
    );
  });
  return scored.map((s) => s.p);
}

/** Catégories avec leur nombre de produits (par public si demandé) et une image d'illustration */
export async function getCategoriesWithCounts(audiences?: Audience[]) {
  const [cats, items] = await Promise.all([getCategories(), getProducts({ audiences })]);
  return cats
    .map((c) => {
      const inCat = items.filter((p) => p.categoryId === c.id);
      return { ...c, count: inCat.length, sampleImage: inCat[0]?.images[0]?.url };
    })
    .filter((c) => c.count > 0);
}

/** Produits mis en avant (page d'accueil) */
export async function getFeaturedProducts() {
  await connection();
  return db.query.products.findMany({
    where: and(eq(products.isActive, true), eq(products.isFeatured, true)),
    with: { images: { orderBy: asc(productImages.position) } },
    orderBy: desc(products.createdAt),
    limit: 6,
  });
}

/** Un produit en boutique par slug (page détail), avec ses avis publiés */
export async function getProductBySlug(slug: string) {
  await connection();
  return db.query.products.findFirst({
    // Brouillons et produits masqués : introuvables côté boutique
    where: and(eq(products.slug, slug), eq(products.isActive, true)),
    with: {
      images: { orderBy: asc(productImages.position) },
      category: true,
      reviews: {
        where: eq(reviews.isPublished, true),
        orderBy: desc(reviews.createdAt),
      },
    },
  });
}

// ─── Recommandations ────────────────────────────────────

/** Catalogue actif avec 1re image : base de toutes les recommandations */
function getCatalog() {
  return db.query.products.findMany({
    where: eq(products.isActive, true),
    with: {
      images: {
        where: eq(productImages.kind, "image"),
        orderBy: asc(productImages.position),
        limit: 1,
      },
    },
    orderBy: [desc(products.isFeatured), desc(products.createdAt)],
  });
}
type CatalogProduct = Awaited<ReturnType<typeof getCatalog>>[number];

/** Produits achetés dans les mêmes commandes que `productIds` (hors annulées) */
async function coBoughtWith(productIds: string[]) {
  if (!productIds.length) return new Map<string, number>();
  const rows = await db
    .select({ productId: other.productId, n: count() })
    .from(orderItems)
    .innerJoin(other, eq(other.orderId, orderItems.orderId))
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(inArray(orderItems.productId, productIds), ne(orders.status, "ANNULEE")))
    .groupBy(other.productId);
  return new Map(rows.flatMap((r) => (r.productId ? [[r.productId, r.n] as const] : [])));
}

/** Produits vus par les visiteurs qui ont vu `productIds` (nb de visiteurs distincts) */
async function coViewedWith(productIds: string[], excludeVisitor?: string) {
  if (!productIds.length) return new Map<string, number>();
  const rows = await db
    .select({ productId: otherView.productId, n: countDistinct(otherView.visitorId) })
    .from(productViews)
    .innerJoin(otherView, eq(otherView.visitorId, productViews.visitorId))
    .where(
      and(
        inArray(productViews.productId, productIds),
        excludeVisitor ? ne(productViews.visitorId, excludeVisitor) : undefined
      )
    )
    .groupBy(otherView.productId);
  return new Map(rows.map((r) => [r.productId, r.n]));
}

/** Historique d'un visiteur : consultations (plus récentes d'abord) et achats */
async function getVisitorHistory(visitorId: string) {
  const [views, bought] = await Promise.all([
    db
      .select({ productId: productViews.productId, last: max(productViews.createdAt) })
      .from(productViews)
      .where(eq(productViews.visitorId, visitorId))
      .groupBy(productViews.productId)
      .orderBy(desc(max(productViews.createdAt)))
      .limit(30),
    db
      .selectDistinct({ productId: orderItems.productId })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.visitorId, visitorId), ne(orders.status, "ANNULEE"))),
  ]);
  return {
    viewed: views.map((v) => v.productId),
    purchased: bought.flatMap((b) => (b.productId ? [b.productId] : [])),
  };
}

/**
 * Suggestions personnalisées d'après ce que le visiteur a acheté et consulté,
 * toujours dans les catégories qui l'intéressent (celles de ses achats et
 * consultations ; sur une fiche produit, uniquement la catégorie du produit) :
 * - produits souvent achetés avec ses achats (+3 par commande commune)
 * - même catégorie qu'un achat (+3) ou qu'une consultation (+2)
 * - vus par les clients qui ont vu les mêmes produits (+1 par visiteur)
 * Les produits déjà achetés et `exclude` sont écartés.
 */
async function personalize(catalog: CatalogProduct[], visitorId: string | undefined, exclude?: { id: string; categoryId: string | null }) {
  if (!visitorId) return { forYou: [], recentlyViewed: [] };
  const { viewed, purchased } = await getVisitorHistory(visitorId);
  if (!viewed.length && !purchased.length) return { forYou: [], recentlyViewed: [] };

  const byId = new Map(catalog.map((p) => [p.id, p]));
  const catsOf = (ids: string[]) => new Set(ids.map((id) => byId.get(id)?.categoryId).filter(Boolean));
  const boughtCats = catsOf(purchased);
  const viewedCats = catsOf(viewed.slice(0, 10));
  const [coBought, coViewed] = await Promise.all([
    coBoughtWith(purchased),
    coViewedWith(viewed.slice(0, 10), visitorId),
  ]);

  const recentlyViewed = viewed
    .filter((id) => id !== exclude?.id)
    .flatMap((id) => byId.get(id) ?? [])
    .slice(0, 8);

  // Catégories proposées : celle de la fiche consultée, sinon celles du visiteur
  const inScope = (p: CatalogProduct) =>
    exclude ? !!exclude.categoryId && p.categoryId === exclude.categoryId : boughtCats.has(p.categoryId) || viewedCats.has(p.categoryId);

  // Pas de doublon avec « Récemment consultés » ni avec ce qui est déjà acheté
  const skip = new Set([...purchased, ...recentlyViewed.map((p) => p.id), exclude?.id]);
  const forYou = catalog
    .filter((p) => !skip.has(p.id) && inScope(p))
    .map((p) => ({
      p,
      score:
        3 * (coBought.get(p.id) ?? 0) +
        (boughtCats.has(p.categoryId) ? 3 : 0) +
        (viewedCats.has(p.categoryId) ? 2 : 0) +
        (coViewed.get(p.id) ?? 0),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.p);

  return { forYou, recentlyViewed };
}

/**
 * Recommandations de la fiche produit, toutes dans la MÊME CATÉGORIE que le
 * produit (une chaussure propose des chaussures, un parfum des parfums), le
 * même public en premier (homme, femme, enfant) :
 * - boughtTogether : achetés dans les mêmes commandes, complété par la catégorie
 * - related : la catégorie, même public d'abord puis les plus consultés
 * - alsoViewed : vus par les clients qui ont consulté ce produit, complété par
 *   les fiches les plus consultées de la catégorie
 * - forYou / recentlyViewed : selon l'historique du visiteur
 */
export async function getProductRecommendations(
  product: { id: string; categoryId: string | null; audience: Audience },
  visitorId?: string
) {
  await connection();
  const [catalog, coBought, coViewed] = await Promise.all([
    getCatalog(),
    coBoughtWith([product.id]),
    coViewedWith([product.id], visitorId),
  ]);
  // Même catégorie uniquement (rien à proposer pour un produit sans catégorie)
  const sameCat = product.categoryId ? catalog.filter((p) => p.id !== product.id && p.categoryId === product.categoryId) : [];
  const audienceFirst = (list: CatalogProduct[]) => [
    ...list.filter((p) => sameAudience(p.audience, product.audience)),
    ...list.filter((p) => !sameAudience(p.audience, product.audience)),
  ];
  const byViews = [...sameCat].sort((a, b) => b.viewCount - a.viewCount);
  const rank = (scores: Map<string, number>) =>
    sameCat.filter((p) => scores.has(p.id)).sort((a, b) => scores.get(b.id)! - scores.get(a.id)!);
  const fill = (start: CatalogProduct[], pool: CatalogProduct[], max: number) => {
    const out = [...start];
    for (const p of pool) {
      if (out.length >= max) break;
      if (!out.includes(p)) out.push(p);
    }
    return out.slice(0, max);
  };

  const sameAudienceCat = sameCat.filter((p) => sameAudience(p.audience, product.audience));
  const boughtTogether = fill(rank(coBought), sameAudienceCat, 2);
  const related = audienceFirst(byViews).slice(0, 8);
  // Pas de doublon avec « Produits liés » : uniquement ce que d'autres clients ont vu en plus
  const alsoViewed = fill(rank(coViewed), audienceFirst(byViews), 16)
    .filter((p) => !related.includes(p))
    .slice(0, 8);

  const { forYou, recentlyViewed } = await personalize(catalog, visitorId, product);

  return { boughtTogether, related, alsoViewed, forYou, recentlyViewed };
}
/** Suggestions de la page d'accueil (vides pour un nouveau visiteur) */
export async function getHomeRecommendations(visitorId?: string) {
  await connection();
  if (!visitorId) return { forYou: [], recentlyViewed: [] };
  return personalize(await getCatalog(), visitorId);
}

/** Toutes les catégories */
export async function getCategories() {
  await connection();
  return db.select().from(categories).orderBy(asc(categories.name));
}
