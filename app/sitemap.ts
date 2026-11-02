import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const rows = await db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(eq(products.isActive, true));

  const cats = await db.select({ slug: categories.slug }).from(categories);
  const categoryUrls = cats.map((c) => ({
    url: `${base}/categorie/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const productUrls = rows.map((p) => ({
    url: `${base}/produit/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    { url: `${base}/boutique`, changeFrequency: "daily", priority: 0.9 },
    ...categoryUrls,
    ...productUrls,
  ];
}
