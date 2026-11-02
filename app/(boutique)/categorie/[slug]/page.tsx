import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getCategoriesWithCounts } from "@/lib/queries";
import { categoryVisual, genres, parseGenre } from "@/lib/catalog-visuals";
import { ProductBrowser, parseSort } from "@/components/product-browser";
import { GridSkeleton } from "@/components/grid-skeleton";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ q?: string; genre?: string; tri?: string }>;

async function findCategory(slug: string) {
  return (await getCategoriesWithCounts()).find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await findCategory(slug);
  if (!cat) return { title: "Catégorie introuvable" };
  const visual = categoryVisual(cat.slug, cat.sampleImage);
  return {
    title: cat.name,
    description: `${visual.tagline} — ${cat.count} produits ${cat.name.toLowerCase()} pour homme et femme.`,
    openGraph: { images: [{ url: visual.image }] },
  };
}

export default function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <div className="wrap" style={{ padding: "2rem 1.25rem" }}>
          <GridSkeleton />
        </div>
      }
    >
      <Category params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Category({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cat = await findCategory(slug);
  if (!cat) notFound();
  const visual = categoryVisual(cat.slug, cat.sampleImage);
  const genre = parseGenre(sp.genre);

  return (
    <>
      {/* Affiche de la catégorie */}
      <section className="category-banner">
        <Image
          src={visual.image}
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover" }}
          loading="eager"
          fetchPriority="high"
        />
        <div className="category-banner-overlay" />
        <div className="wrap category-banner-text">
          <nav style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            <Link href="/" style={{ color: "inherit" }}>
              Accueil
            </Link>
            {" / "}
            <Link href="/boutique" style={{ color: "inherit" }}>
              Boutique
            </Link>
          </nav>
          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)" }}>{cat.name}</h1>
          <p style={{ margin: "0.5rem 0 0", fontSize: "1.1rem", opacity: 0.92 }}>
            {visual.tagline} · {cat.count} produit{cat.count > 1 ? "s" : ""}
            {genre && ` · sélection ${genres[genre].label.toLowerCase()}`}
          </p>
        </div>
      </section>

      <div className="wrap" style={{ padding: "2rem 1.25rem 3rem" }}>
        <ProductBrowser
          basePath={`/categorie/${cat.slug}`}
          fixedCategory={cat.slug}
          filters={{ genre, q: sp.q?.trim() || undefined, sort: parseSort(sp.tri) }}
        />
      </div>

      <style>{`
        .category-banner {
          position: relative;
          min-height: 280px;
          display: flex;
          align-items: flex-end;
          color: #fff;
          overflow: hidden;
        }
        .category-banner-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(20,40,30,0.85) 0%, rgba(20,40,30,0.45) 55%, rgba(20,40,30,0.1) 100%);
        }
        .category-banner-text { position: relative; width: 100%; padding-top: 3rem; padding-bottom: 2.25rem; }
        .category-banner-text h1 { color: #fff; }
      `}</style>
    </>
  );
}
