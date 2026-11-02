// Photos produits envoyées depuis l'admin : redimensionnées dans le
// navigateur (carré PHOTO_SIZE × PHOTO_SIZE, JPEG), vérifiées ici puis
// stockées en base et servies par /media/<id>.
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { customers, mediaFiles, productImages } from "./db/schema";

/** Côté du carré final, en pixels (2× la largeur d'affichage de la fiche : net sur mobile et écrans HD) */
export const PHOTO_SIZE = 1200;
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;

export const mediaUrl = (id: string) => `/media/${id}`;
const MEDIA_PREFIX = "/media/";

/** Dimensions d'un JPEG lues dans son en-tête (marqueur SOF), sans dépendance */
export function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    // SOF0..SOF15 hors DHT (C4), JPG (C8) et DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

/** Photo de profil client : carré plus petit (affichée en vignette ronde) */
export const AVATAR_SIZE = 400;

/** Enregistre un JPEG carré `side` × `side` (redimensionné par le navigateur) */
async function saveSquareJpeg(buf: Buffer, side: number) {
  const size = jpegSize(buf);
  if (!size) throw new Error("Fichier illisible : la photo doit être redimensionnée avant l'envoi.");
  if (size.width !== side || size.height !== side) {
    throw new Error(`La photo doit faire ${side} × ${side} px.`);
  }
  const [row] = await db
    .insert(mediaFiles)
    .values({ mime: "image/jpeg", width: size.width, height: size.height, size: buf.length, data: buf })
    .returning({ id: mediaFiles.id });
  return mediaUrl(row.id);
}

export const saveProductPhoto = (buf: Buffer) => saveSquareJpeg(buf, PHOTO_SIZE);
export const saveAvatar = (buf: Buffer) => saveSquareJpeg(buf, AVATAR_SIZE);

/** Id d'un média stocké en base à partir de son adresse (null pour /products/… ou https://…) */
export function mediaIdFromUrl(url: string) {
  return url.startsWith(MEDIA_PREFIX) ? url.slice(MEDIA_PREFIX.length) : null;
}

/**
 * Supprime les photos envoyées mais rattachées ni à un produit ni à un profil
 * client (formulaire abandonné, photo retirée) depuis plus d'un jour.
 */
export async function purgeOrphanMedia() {
  await db.delete(mediaFiles).where(
    and(
      lt(mediaFiles.createdAt, sql`now() - interval '1 day'`),
      sql`not exists (select 1 from ${productImages} where ${productImages.url} = '/media/' || ${mediaFiles.id} or ${productImages.poster} = '/media/' || ${mediaFiles.id})`,
      sql`not exists (select 1 from ${customers} where ${customers.avatarUrl} = '/media/' || ${mediaFiles.id})`
    )
  );
}

export async function getMedia(id: string) {
  return db.query.mediaFiles.findFirst({ where: eq(mediaFiles.id, id) });
}
