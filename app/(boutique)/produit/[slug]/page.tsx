import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug, getProductRecommendations } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";
import { paymentsEnabled } from "@/lib/config";
import { AddToCart } from "@/components/add-to-cart";
import { ProductCarousel } from "@/components/product-carousel";
import { ProductReviews } from "@/components/product-reviews";
import { ProductRail } from "@/components/product-rail";
import { BoughtTogether } from "@/components/bought-together";
import { TrackView } from "@/components/track-view";
import { getVisitorId } from "@/lib/visitor";
import { getCurrentCustomer } from "@/lib/customer-auth";

import { audienceLabel } from "@/lib/audience";
import { DescriptionExcerpt, DescriptionSection } from "@/components/product-description";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produit introuvable" };

  const image = product.images[0]?.url;
  const desc = product.description.slice(0, 160);
  return {
    title: product.name,
    description: desc,
    openGraph: {
      title: product.name,
      description: desc,
      type: "website",
      images: image ? [{ url: image, width: 600, height: 600, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: desc,
      images: image ? [image] : [],
    },
  };
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, customer] = await Promise.all([getProductBySlug(slug), getCurrentCustomer()]);
  if (!product) notFound();

  const image = product.images[0]?.url;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const reviewCount = product.reviews.length;
  const ratingAvg = reviewCount
    ? product.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount
    : 0;

  // Données structurées pour le référencement / partage
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.filter((i) => i.kind === "image").map((i) => i.url),
    ...(reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: ratingAvg.toFixed(1),
        reviewCount,
      },
    }),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "XAF",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="wrap" style={{ padding: "2rem 1.25rem 1rem" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav style={{ fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        <Link href="/boutique" className="link-muted">
          Boutique
        </Link>
        {product.category && (
          <>
            <span style={{ color: "var(--muted)" }}> / </span>
            <Link
              href={`/categorie/${product.category.slug}`}
              className="link-muted"
            >
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: "2.5rem",
          alignItems: "start",
        }}
        className="product-detail-grid"
      >
        {/* Photos */}
        <ProductCarousel media={product.images} name={product.name} interval={5000} />

        {/* Infos */}
        <div>
          <span
            className="chip"
            style={{ background: "var(--foliage-soft)", color: "var(--foliage)" }}
          >
            {audienceLabel[product.audience]}
            {product.category ? ` · ${product.category.name}` : ""}
          </span>

          <h1
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              color: "var(--forest)",
              margin: "0.85rem 0 0.5rem",
            }}
          >
            {product.name}
          </h1>

          <p
            style={{
              fontSize: "1.6rem",
              color: "var(--foliage)",
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              margin: "0 0 0.5rem",
            }}
          >
            {formatPrice(product.price)}
          </p>

          {reviewCount > 0 && (
            <a href="#avis" className="link-muted" style={{ fontSize: "0.88rem", display: "inline-block", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--brass)" }}>★</span> {ratingAvg.toFixed(1).replace(".", ",")} · {reviewCount} avis
            </a>
          )}

          <div style={{ marginBottom: "1.25rem" }}>
            {product.stock > 0 ? (
              <span style={{ fontSize: "0.9rem", color: lowStock ? "var(--earth)" : "var(--success)" }}>
                {lowStock
                  ? `Plus que ${product.stock} en stock — vite !`
                  : "En stock · prêt à expédier"}
              </span>
            ) : (
              <span style={{ fontSize: "0.9rem", color: "var(--danger)" }}>
                Actuellement épuisé
              </span>
            )}
          </div>

          <DescriptionExcerpt text={product.description} />

          <AddToCart
            productId={product.id}
            slug={product.slug}
            name={product.name}
            price={product.price}
            stock={product.stock}
            image={image}
          />

          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--line)",
              display: "grid",
              gap: "0.6rem",
              fontSize: "0.9rem",
              color: "var(--muted)",
            }}
          >
            <span>🚚 Livraison partout au Cameroun</span>
            <span>📍 Suivi de ta commande étape par étape dans ton compte</span>
            {paymentsEnabled ? (
              <span>📱 Paiement par Mobile Money (MTN / Orange)</span>
            ) : (
              <span>📱 Paiement Mobile Money ou espèces, validé par notre équipe</span>
            )}
          </div>
        </div>
      </div>

      <DescriptionSection text={product.description} name={product.name} />

      <TrackView productId={product.id} />

      <Suspense fallback={null}>
        <Recommendations product={product} position="top" />
      </Suspense>

      <ProductReviews
        productId={product.id}
        productName={product.name}
        productSlug={product.slug}
        reviews={product.reviews}
        viewer={customer && { id: customer.id, firstName: customer.firstName }}
      />

      <Suspense fallback={null}>
        <Recommendations product={product} position="bottom" />
      </Suspense>

      <style>{`
        @media (max-width: 860px) {
          .product-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

type DetailProduct = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

// Au-dessus des avis : achetés ensemble + produits liés ;
// en dessous : consultés par les autres clients + suggestions selon l'historique du visiteur.
// React mémorise la requête pendant le rendu, elle n'est exécutée qu'une fois.
async function Recommendations({
  product,
  position,
}: {
  product: DetailProduct;
  position: "top" | "bottom";
}) {
  const { boughtTogether, related, alsoViewed, forYou, recentlyViewed } =
    await getRecommendations(product, await getVisitorId());

  if (position === "bottom") {
    return (
      <>
        <ProductRail title="Fréquemment consultés par les clients" products={alsoViewed} />
        <ProductRail title="Inspiré de tes achats et consultations" products={forYou} />
        <ProductRail title="Tes produits consultés récemment" products={recentlyViewed} />
      </>
    );
  }

  const toBundle = (p: { id: string; slug: string; name: string; price: number; stock: number; images: { url: string }[] }) => ({
    productId: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    stock: p.stock,
    image: p.images[0]?.url,
  });

  return (
    <>
      {boughtTogether.length > 0 && (
        <BoughtTogether items={[toBundle(product), ...boughtTogether.map(toBundle)]} />
      )}
      <ProductRail title="Produits liés à cet article" products={related} />
    </>
  );
}

const getRecommendations = cache((product: DetailProduct, visitorId?: string) =>
  getProductRecommendations(product, visitorId)
);

function ProductSkeleton() {
  return (
    <div className="wrap" style={{ padding: "2rem 1.25rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: "2.5rem",
        }}
        className="product-detail-grid"
      >
        <div
          style={{
            aspectRatio: "1/1",
            borderRadius: "1.1rem",
            background: "var(--ivory-deep)",
          }}
        />
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <div style={{ height: 32, width: "70%", background: "var(--ivory-deep)", borderRadius: 6 }} />
          <div style={{ height: 24, width: "30%", background: "var(--ivory-deep)", borderRadius: 6 }} />
          <div style={{ height: 80, width: "100%", background: "var(--ivory-deep)", borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}
