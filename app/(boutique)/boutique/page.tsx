import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductBrowser, parseSort } from "@/components/product-browser";
import { genres, parseGenre } from "@/lib/catalog-visuals";
import { GridSkeleton } from "@/components/grid-skeleton";

type SearchParams = Promise<{ q?: string; genre?: string; categorie?: string; tri?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { q, genre } = await searchParams;
  const g = parseGenre(genre);
  if (q) return { title: `Recherche « ${q} »`, robots: { index: false } };
  return {
    title: g ? `Sélection ${genres[g].label}` : "Boutique",
    description: g ? genres[g].tagline : "Tous nos produits de beauté et de soin pour homme et femme.",
  };
}

export default function BoutiquePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="wrap" style={{ padding: "2rem 1.25rem 3rem" }}>
      <Suspense fallback={<GridSkeleton />}>
        <Boutique searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Boutique({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const genre = parseGenre(sp.genre);

  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.6rem)", color: "var(--forest)" }}>
          {genre ? genres[genre].title : "La boutique"}
        </h1>
        <p style={{ margin: "0.5rem 0 0", color: "var(--muted)" }}>
          {genre ? genres[genre].tagline : "Tous nos soins, parfums et indispensables, pour elle et pour lui."}
        </p>
      </header>
      <ProductBrowser
        basePath="/boutique"
        filters={{ genre, q: sp.q?.trim() || undefined, sort: parseSort(sp.tri), categorie: sp.categorie }}
      />
    </>
  );
}
