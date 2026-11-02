// Médias d'un produit tels que présents sur le disque (public/products) :
// photos <slug>.jpg, <slug>-2.jpg… et vidéo facultative videos/<slug>.mp4
// (+ aperçu videos/<slug>.jpg). Partagé par le seed et fetch-images.
import { existsSync } from "node:fs";
import path from "node:path";

export const PRODUCTS_DIR = path.join(process.cwd(), "public", "products");

/** 1re photo : slug.jpg, suivantes : slug-2.jpg, slug-3.jpg… */
export function photoFile(slug: string, index: number) {
  return index === 0 ? `${slug}.jpg` : `${slug}-${index + 1}.jpg`;
}

/**
 * Lignes product_images à insérer, dans l'ordre du carrousel :
 * 1re photo (vignette du produit), puis la vidéo, puis les autres photos.
 * À défaut de photo, le placeholder SVG.
 */
export function mediaRows(slug: string, productId: string, alt: string | null) {
  const photos: string[] = [];
  for (let i = 0; existsSync(path.join(PRODUCTS_DIR, photoFile(slug, i))); i++) {
    photos.push(`/products/${photoFile(slug, i)}`);
  }
  if (photos.length === 0) photos.push(`/products/${slug}.svg`);

  const rows: {
    productId: string;
    url: string;
    kind: "image" | "video";
    poster: string | null;
    alt: string | null;
    position: number;
  }[] = photos.map((url) => ({ productId, url, kind: "image", poster: null, alt, position: 0 }));

  if (existsSync(path.join(PRODUCTS_DIR, "videos", `${slug}.mp4`))) {
    const poster = existsSync(path.join(PRODUCTS_DIR, "videos", `${slug}.jpg`))
      ? `/products/videos/${slug}.jpg`
      : photos[0];
    rows.splice(1, 0, { productId, url: `/products/videos/${slug}.mp4`, kind: "video", poster, alt, position: 0 });
  }
  return rows.map((r, position) => ({ ...r, position }));
}
