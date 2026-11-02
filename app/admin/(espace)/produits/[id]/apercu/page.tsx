import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { asc, eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import { formatPrice } from "@/lib/utils";
import { audienceLabel } from "@/lib/audience";
import { AdminPage } from "@/components/admin/admin-page";
import { ProductCarousel } from "@/components/product-carousel";
import { ProductCard } from "@/components/product-card";
import { DescriptionExcerpt, DescriptionSection } from "@/components/product-description";
import { PublishButton } from "../../publish-button";

export const metadata = { title: "Aperçu du produit", robots: { index: false } };

/** Aperçu admin : la fiche telle que le client la verra, avant publication */
export default async function ProductPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cree?: string; modifie?: string }>;
}) {
  await connection();
  await requireAdminPage();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: { images: { orderBy: asc(productImages.position) }, category: true },
  });
  if (!product) notFound();

  const photos = product.images.filter((m) => m.kind === "image");
  const state = product.isActive ? "online" : product.publishedAt ? "hidden" : "draft";
  const banner = {
    draft: { bg: "#fdf6e3", border: "#e8d4a0", text: "🔒 Brouillon : ce produit n'est pas encore visible en boutique." },
    hidden: { bg: "#fbeae8", border: "#e8c4bf", text: "🙈 Masqué : ce produit a été retiré de la boutique." },
    online: { bg: "var(--foliage-soft)", border: "#b9d8c3", text: "✓ En ligne : ce produit est visible et commandable en boutique." },
  }[state];

  return (
    <AdminPage
      title={`Aperçu : ${product.name}`}
      actions={
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "start" }}>
          <Link href={`/admin/produits/${id}`} className="btn btn-outline">
            ✎ Modifier
          </Link>
          {product.isActive && (
            <a href={`/produit/${product.slug}`} target="_blank" rel="noreferrer" className="btn btn-outline">
              Voir en boutique ↗
            </a>
          )}
          <PublishButton id={id} online={product.isActive} />
        </div>
      }
    >
      {(sp.cree || sp.modifie) && (
        <p role="status" style={{ margin: "0 0 0.75rem", color: "var(--success)", fontSize: "0.9rem" }}>
          ✓ {sp.cree ? "Produit enregistré en brouillon." : "Modifications enregistrées."} Vérifie l&apos;aperçu ci-dessous
          {product.isActive ? " : il est déjà en ligne." : ", puis publie-le."}
        </p>
      )}
      <div style={{ padding: "0.8rem 1rem", borderRadius: "0.8rem", background: banner.bg, border: `1px solid ${banner.border}`, marginBottom: "1.25rem", fontSize: "0.92rem" }}>
        {banner.text}
        {!photos.length && <strong style={{ display: "block", marginTop: 4, color: "var(--danger)" }}>Ajoute au moins une photo pour pouvoir le publier.</strong>}
      </div>

      <h2 className="pv-h">Fiche produit</h2>
      <div className="pv-sheet">
        <div className="pv-grid">
          {product.images.length ? (
            <ProductCarousel media={product.images} name={product.name} interval={5000} />
          ) : (
            <div style={{ aspectRatio: "1", borderRadius: "1rem", background: "var(--ivory-deep)", display: "grid", placeItems: "center", color: "var(--muted)" }}>Aucune photo</div>
          )}
          <div>
            <span className="chip" style={{ background: "var(--foliage-soft)", color: "var(--foliage)" }}>
              {audienceLabel[product.audience]}
              {product.category ? ` · ${product.category.name}` : ""}
            </span>
            <h3 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "var(--forest)", margin: "0.85rem 0 0.5rem" }}>{product.name}</h3>
            <p style={{ fontSize: "1.5rem", color: "var(--foliage)", fontWeight: 600, fontFamily: "var(--font-display)", margin: "0 0 0.5rem" }}>{formatPrice(product.price)}</p>
            <p style={{ fontSize: "0.9rem", margin: "0 0 1rem", color: product.stock === 0 ? "var(--danger)" : product.stock <= 5 ? "var(--earth)" : "var(--success)" }}>
              {product.stock === 0 ? "Actuellement épuisé" : product.stock <= 5 ? `Plus que ${product.stock} en stock — vite !` : "En stock · prêt à expédier"}
            </p>
            <DescriptionExcerpt text={product.description} />
            <button type="button" className="btn btn-primary" disabled style={{ opacity: 0.6, cursor: "default" }}>
              Ajouter au panier (aperçu)
            </button>
          </div>
        </div>
        <DescriptionSection text={product.description} name={product.name} />
      </div>

      <h2 className="pv-h">Vignette dans les listes</h2>
      {/* Aperçu non cliquable : la fiche boutique n'existe pas tant que le produit est hors ligne */}
      <div style={{ maxWidth: 260, pointerEvents: "none" }} aria-hidden>
        <ProductCard slug={product.slug} name={product.name} price={product.price} stock={product.stock} audience={product.audience} image={photos[0]?.url} eager />
      </div>

      <style>{`
        .pv-h { font-size: 1rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin: 1.5rem 0 0.75rem; }
        .pv-sheet { border: 1px solid var(--line); border-radius: 1rem; background: #fff; padding: clamp(1rem, 3vw, 2rem); }
        .pv-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2rem; align-items: start; }
        @media (max-width: 800px) { .pv-grid { grid-template-columns: 1fr; } }
      `}</style>
    </AdminPage>
  );
}
