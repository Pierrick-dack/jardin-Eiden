import Link from "next/link";
import { ProductCard } from "./product-card";
import type { Audience } from "@/lib/db/schema";

type RailProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  audience: Audience;
  images: { url: string }[];
};

/** Rangée de produits défilant horizontalement (recommandations) */
export function ProductRail({
  title,
  products,
  href,
}: {
  title: string;
  products: RailProduct[];
  /** Lien « Voir tout » facultatif */
  href?: string;
}) {
  if (products.length === 0) return null;
  return (
    <section style={{ marginTop: "3.5rem" }} aria-label={title}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.5rem", color: "var(--forest)" }}>{title}</h2>
        {href && (
          <Link href={href} className="link-muted" style={{ fontSize: "0.92rem", whiteSpace: "nowrap" }}>
            Voir tout →
          </Link>
        )}
      </div>
      <div className="product-rail">
        {products.map((p) => (
          <div key={p.id} style={{ scrollSnapAlign: "start" }}>
            <ProductCard
              slug={p.slug}
              name={p.name}
              price={p.price}
              stock={p.stock}
              audience={p.audience}
              image={p.images[0]?.url}
            />
          </div>
        ))}
      </div>
      <style>{`
        .product-rail {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(200px, 230px);
          gap: 1.25rem;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: thin;
          /* Marge intérieure pour la carte agrandie au survol (sinon coupée
             par le défilement horizontal), compensée à l'extérieur */
          padding: 14px 14px 80px;
          margin: -14px -14px -66px;
          scroll-padding-inline: 14px;
        }
      `}</style>
    </section>
  );
}
