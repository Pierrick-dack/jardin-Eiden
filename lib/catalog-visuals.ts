// Affiches et accroches des univers de la boutique (page d'accueil, pages catégorie).
// Images dans /public/brand/posters (voir lib/db/fetch-images.ts).

import type { Genre } from "./audience";
export type { Genre } from "./audience";

export const genres: Record<Genre, { label: string; title: string; tagline: string; image: string }> = {
  femme: {
    label: "Femme",
    title: "Pour Elle",
    tagline: "Soins, parfums et maquillage pour sublimer ta beauté naturelle.",
    image: "/brand/posters/pour-elle.jpg",
  },
  homme: {
    label: "Homme",
    title: "Pour Lui",
    tagline: "Barbe, rasage, soins et parfums : l'essentiel du gentleman.",
    image: "/brand/posters/pour-lui.jpg",
  },
  enfants: {
    label: "Enfants",
    title: "Pour les enfants",
    tagline: "Des soins doux et des brosses à dents ludiques pour les filles et les garçons.",
    image: "/brand/posters/pour-enfants.jpg",
  },
  filles: {
    label: "Filles",
    title: "Pour les filles",
    tagline: "Cheveux, bain, parfums et dents : tout pour les petites princesses.",
    image: "/brand/posters/pour-enfants.jpg",
  },
  garcons: {
    label: "Garçons",
    title: "Pour les garçons",
    tagline: "Coiffure, bain, parfums et dents : l'essentiel des petits hommes.",
    image: "/brand/posters/pour-enfants.jpg",
  },
};

/** Sélections mises en avant en grandes affiches sur l'accueil */
export const mainGenres: Genre[] = ["femme", "homme", "enfants"];

export function parseGenre(value?: string | null): Genre | undefined {
  return value && Object.hasOwn(genres, value) ? (value as Genre) : undefined;
}

const categoryVisuals: Record<string, { image: string; tagline: string }> = {
  "soins-visage": { image: "/brand/posters/soins-visage.jpg", tagline: "Nettoyer, hydrater, illuminer" },
  "soins-corps": { image: "/brand/posters/soins-corps.jpg", tagline: "Une peau douce de la tête aux pieds" },
  cheveux: { image: "/brand/posters/cheveux.jpg", tagline: "Force, brillance et boucles définies" },
  parfums: { image: "/brand/posters/parfums.jpg", tagline: "Des sillages qui marquent les esprits" },
  maquillage: { image: "/brand/posters/maquillage.jpg", tagline: "Teint, regard et lèvres sublimés" },
  "barbe-rasage": { image: "/brand/posters/barbe-rasage.jpg", tagline: "Une barbe soignée, un rasage net" },
  "hygiene-dentaire": { image: "/brand/posters/hygiene-dentaire.jpg", tagline: "Brosses à dents et dentifrices pour toute la famille" },
};

/** Affiche d'une catégorie ; à défaut, la 1re photo d'un de ses produits */
export function categoryVisual(slug: string, fallbackImage?: string) {
  return (
    categoryVisuals[slug] ?? {
      image: fallbackImage ?? "/brand/jardin-eiden-profil.png",
      tagline: "Découvre notre sélection",
    }
  );
}

/** Bannières défilantes en haut de l'accueil */
export const heroBanners = [
  {
    image: "/brand/posters/banniere-elle.jpg",
    eyebrow: "Collection Femme",
    title: "Révèle ton éclat naturel",
    text: "Soins visage, corps et cheveux sélectionnés pour les peaux et cheveux d'Afrique.",
    cta: { label: "Découvrir la sélection Femme", href: "/boutique?genre=femme" },
  },
  {
    image: "/brand/posters/banniere-lui.jpg",
    eyebrow: "Collection Homme",
    title: "L'art du soin masculin",
    text: "Huiles à barbe, rasage traditionnel et parfums de caractère.",
    cta: { label: "Découvrir la sélection Homme", href: "/boutique?genre=homme" },
  },
  {
    image: "/brand/posters/banniere-parfums.jpg",
    eyebrow: "Parfums",
    title: "Des sillages inoubliables",
    text: "Oud, vanille, agrumes, fleurs blanches : trouve la fragrance qui te ressemble.",
    cta: { label: "Voir les parfums", href: "/categorie/parfums" },
  },
  {
    image: "/brand/posters/banniere-enfants.jpg",
    eyebrow: "Nouveau · Enfants",
    title: "Des soins doux pour les petits",
    text: "Shampoings, bain, colognes et brosses à dents ludiques pour les filles et les garçons.",
    cta: { label: "Découvrir l'univers Enfants", href: "/boutique?genre=enfants" },
  },
];
