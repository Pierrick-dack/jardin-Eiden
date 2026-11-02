// Redimensionnement d'image dans le navigateur (photos produits, photo de
// profil) : recadrage carré centré puis réduction par paliers successifs (÷2)
// jusqu'à la taille finale. Une réduction directe d'une grande photo la rend
// floue ou crénelée ; les paliers gardent une image nette.
// Ensuite : contrôle qualité (lib/image-quality) et amélioration douce.
import { analyzeQuality, autoLevels, sharpen, type QualityReport } from "./image-quality";

export type ResizeResult = { blob: Blob; report: QualityReport };

export async function resizeToSquare(
  file: File,
  size: number,
  { minSource = 300, quality = 0.9, enhance = true } = {}
): Promise<ResizeResult> {
  let bitmap: ImageBitmap;
  try {
    // L'orientation EXIF (photo prise au téléphone) est appliquée
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Format non pris en charge (utilise JPEG, PNG ou WebP).");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  if (side < minSource) {
    bitmap.close();
    throw new Error(`Photo trop petite (${bitmap.width} × ${bitmap.height}) : ${minSource} px minimum de côté pour rester nette.`);
  }

  const canvas = (w: number) => {
    const c = document.createElement("canvas");
    c.width = c.height = w;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    return [c, ctx] as const;
  };

  // 1. Recadrage carré centré, à la taille d'origine
  const [crop, cctx] = canvas(side);
  cctx.fillStyle = "#fff"; // fond blanc pour les PNG transparents
  cctx.fillRect(0, 0, side, side);
  cctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, side, side);
  bitmap.close();

  // 2. Réduction par paliers jusqu'à la taille finale
  let cur: HTMLCanvasElement = crop;
  let w = side;
  while (w / 2 > size) {
    w = Math.round(w / 2);
    const [next, nctx] = canvas(w);
    nctx.drawImage(cur, 0, 0, w, w);
    cur = next;
  }
  const [out, octx] = canvas(size);
  octx.drawImage(cur, 0, 0, size, size);

  // 3. Contrôle qualité sur l'image brute, puis amélioration douce
  const img = octx.getImageData(0, 0, size, size);
  const px = { data: img.data, width: size, height: size };
  // Mesure avant correction : l'accentuation gonflerait le score de netteté
  const report = analyzeQuality(px, side);
  if (enhance) {
    if (autoLevels(px)) report.fixes.push("Contraste et luminosité rééquilibrés");
    // Réduction = léger adoucissement : accentuation pour retrouver le piqué
    sharpen(px, side > size ? 0.45 : 0.3);
    report.fixes.push("Netteté accentuée");
    octx.putImageData(img, 0, 0);
  }

  const blob = await new Promise<Blob>((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error("Conversion impossible."))), "image/jpeg", quality)
  );
  return { blob, report };
}
