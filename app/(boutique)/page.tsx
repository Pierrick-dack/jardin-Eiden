import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getProducts, getCategoriesWithCounts, getHomeRecommendations } from "@/lib/queries";
import { getVisitorId } from "@/lib/visitor";
import { categoryVisual, genres, heroBanners, mainGenres, type Genre } from "@/lib/catalog-visuals";
import { genreAudiences } from "@/lib/audience";
import type { Audience } from "@/lib/db/schema";
import { ProductRail } from "@/components/product-rail";
import { HeroBanners } from "@/components/hero-banners";
import { GridSkeleton } from "@/components/grid-skeleton";

export default function HomePage() {
  return (
    <>
      <HeroBanners banners={heroBanners} />

      <div className="wrap" style={{ paddingBottom: "3rem" }}>
        <Suspense fallback={null}>
          <ForYou />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <GenderPosters />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <CategoryPosters />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <Rails />
        </Suspense>

        <Commitments />
        <About />
      </div>
    </>
  );
}

/** Suggestions selon les achats et consultations du visiteur (rien pour un nouveau visiteur) */
async function ForYou() {
  const { forYou, recentlyViewed } = await getHomeRecommendations(await getVisitorId());
  if (!forYou.length && !recentlyViewed.length) return null;
  return (
    <>
      <ProductRail title="Sélectionnés pour toi" products={forYou} />
      <ProductRail title="Reprends là où tu t'es arrêté" products={recentlyViewed} />
    </>
  );
}

/** Grandes affiches : univers Femme, Homme et Enfants */
async function GenderPosters() {
  const lists = await Promise.all(mainGenres.map((g) => getProducts({ audiences: genreAudiences[g] })));
  const counts = Object.fromEntries(mainGenres.map((g, i) => [g, lists[i].length])) as Record<Genre, number>;

  return (
    <section style={{ marginTop: "3.5rem" }} aria-labelledby="genres-title">
      <SectionTitle id="genres-title" eyebrow="Nos sélections" title="Pour elle, pour lui, pour les enfants" />
      <div className="gender-grid">
        {mainGenres.map((g) => (
          <Link key={g} href={`/boutique?genre=${g}`} className="poster gender-poster">
            <Image src={genres[g].image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px" style={{ objectFit: "cover" }} />
            <div className="poster-shade" />
            <div className="poster-text">
              <span className="poster-count">{counts[g]} produits</span>
              <h3 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "#fff" }}>{genres[g].title}</h3>
              <p style={{ margin: "0.4rem 0 1rem", maxWidth: "34ch", opacity: 0.92 }}>{genres[g].tagline}</p>
              <span className="poster-cta">Découvrir →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Affiches des catégories */
async function CategoryPosters() {
  const cats = await getCategoriesWithCounts();
  return (
    <section style={{ marginTop: "3.5rem" }} aria-labelledby="univers-title">
      <SectionTitle id="univers-title" eyebrow="Nos univers" title="Trouve ce qu'il te faut" />
      <div className="category-grid">
        {cats.map((c) => {
          const v = categoryVisual(c.slug, c.sampleImage);
          return (
            <Link key={c.id} href={`/categorie/${c.slug}`} className="poster category-poster">
              <Image src={v.image} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 380px" style={{ objectFit: "cover" }} />
              <div className="poster-shade" />
              <div className="poster-text">
                <h3 style={{ fontSize: "1.45rem", color: "#fff" }}>{c.name}</h3>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.88rem", opacity: 0.9 }}>{v.tagline}</p>
                <span className="poster-count" style={{ marginTop: "0.6rem" }}>
                  {c.count} produit{c.count > 1 ? "s" : ""} →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Rangées de produits mis en avant */
async function Rails() {
  const all = await getProducts();
  const featured = all.filter((p) => p.isFeatured).slice(0, 12);
  const newest = [...all].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 12);
  // Rangées par public : uniquement les produits dédiés (pas les mixtes adultes)
  const onlyFor = (audiences: Audience[]) => all.filter((p) => audiences.includes(p.audience)).slice(0, 12);

  return (
    <>
      <ProductRail title="Nos coups de cœur" products={featured} href="/boutique" />
      <ProductRail title="Nouveautés" products={newest} href="/boutique?tri=nouveautes" />
      <ProductRail title="La sélection Femme" products={onlyFor(["FEMME"])} href="/boutique?genre=femme" />
      <ProductRail title="La sélection Homme" products={onlyFor(["HOMME"])} href="/boutique?genre=homme" />
      <ProductRail title="Pour les enfants" products={onlyFor(genreAudiences.enfants)} href="/boutique?genre=enfants" />
      <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
        <Link href="/boutique" className="btn btn-primary">
          Voir toute la boutique ({all.length} produits)
        </Link>
      </div>
    </>
  );
}

/** Bandeau des engagements */
function Commitments() {
  const items = [
    { icon: "🚚", title: "Livraison au Cameroun", text: "Partout dans le pays, suivi sur WhatsApp" },
    { icon: "📱", title: "Mobile Money", text: "Paiement MTN et Orange en toute sécurité" },
    { icon: "🌿", title: "Sélection naturelle", text: "Des soins choisis pour nos peaux et cheveux" },
    { icon: "💬", title: "Conseils personnalisés", text: "Une question ? On te répond sur WhatsApp" },
  ];
  return (
    <section className="promise-grid" aria-label="Nos engagements">
      {items.map((it) => (
        <div key={it.title} style={{ display: "flex", gap: "0.85rem", alignItems: "start" }}>
          <span aria-hidden style={{ fontSize: "1.6rem" }}>{it.icon}</span>
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--forest)" }}>{it.title}</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.88rem", color: "var(--muted)" }}>{it.text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Présentation de la boutique, avec l'image de marque */
function About() {
  return (
    <section className="about" aria-labelledby="about-title">
      <div className="about-image">
        <Image
          src="/brand/jardin-eiden-profil.png"
          alt="Le Jardin d'Eïden — sélection de produits de soin"
          fill
          sizes="(max-width: 860px) 100vw, 480px"
          style={{ objectFit: "cover" }}
        />
      </div>
      <div>
        <p className="section-eyebrow">Notre histoire</p>
        <h2 id="about-title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", color: "var(--forest)", marginBottom: "1rem" }}>
          La beauté qui pousse au naturel
        </h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: "52ch" }}>
          Au Jardin d&apos;Eïden, on sélectionne avec soin des produits de beauté pour elle et pour lui : karité,
          savon noir, huiles, parfums et soins du quotidien. Commande en quelques clics, paie par Mobile Money,
          et on te livre partout au Cameroun.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
          <Link href="/boutique?genre=femme" className="btn btn-outline">
            Pour elle
          </Link>
          <Link href="/boutique?genre=homme" className="btn btn-outline">
            Pour lui
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 id={id} style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.1rem)", color: "var(--forest)" }}>
        {title}
      </h2>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div style={{ marginTop: "3.5rem" }}>
      <GridSkeleton count={4} />
    </div>
  );
}
