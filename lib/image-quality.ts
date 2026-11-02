// Qualité des photos produits : analyse (netteté, exposition, contraste,
// définition d'origine) et amélioration automatique douce (niveaux +
// accentuation). Fonctions pures sur des pixels RGBA : exécutées dans le
// navigateur pendant le redimensionnement, testables dans Node.

export type Pixels = { data: Uint8ClampedArray; width: number; height: number };

export type QualityGrade = "excellente" | "bonne" | "moyenne" | "faible";

export type QualityReport = {
  score: number; // 0 à 100
  grade: QualityGrade;
  /** Problèmes détectés, en clair, pour l'admin */
  issues: string[];
  /** Corrections appliquées automatiquement */
  fixes: string[];
  metrics: {
    sourceSide: number; // côté de la photo d'origine après recadrage carré
    upscale: number; // > 1 : photo agrandie (perte de netteté)
    sharpness: number; // force moyenne des 2 % de contours les plus nets
    brightness: number; // luminance moyenne 0–255
    contrast: number; // écart type de la luminance
    darkClip: number; // part de pixels quasi noirs (0–1)
    lightClip: number; // part de pixels quasi blancs (0–1)
  };
};

const lum = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

function luminanceMap({ data, width, height }: Pixels) {
  const out = new Float32Array(width * height);
  for (let p = 0, i = 0; p < out.length; p++, i += 4) out[p] = lum(data, i);
  return out;
}

/**
 * Netteté : moyenne des 2 % de réponses du laplacien les plus fortes.
 * Mesurer seulement les contours (et pas toute l'image) évite de pénaliser les
 * photos sur fond uni, très courantes pour les produits.
 */
function sharpnessOf(L: Float32Array, width: number, height: number) {
  const hist = new Uint32Array(1024);
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const v = Math.abs(4 * L[p] - L[p - 1] - L[p + 1] - L[p - width] - L[p + width]);
      hist[Math.min(1023, Math.round(v))]++;
      n++;
    }
  }
  // Moyenne de la tranche haute (2 %) à partir de l'histogramme
  let need = Math.max(1, Math.round(n * 0.02));
  let sum = 0;
  let taken = 0;
  for (let v = 1023; v >= 0 && need > 0; v--) {
    const k = Math.min(hist[v], need);
    sum += k * v;
    taken += k;
    need -= k;
  }
  return taken ? sum / taken : 0;
}

/** Analyse la photo finale (avant accentuation, pour mesurer la netteté réelle) */
export function analyzeQuality(px: Pixels, sourceSide: number, fixes: string[] = []): QualityReport {
  const L = luminanceMap(px);
  let sum = 0;
  let sq = 0;
  let dark = 0;
  let light = 0;
  for (const v of L) {
    sum += v;
    sq += v * v;
    if (v < 12) dark++;
    if (v > 248) light++;
  }
  const n = L.length;
  const brightness = sum / n;
  const contrast = Math.sqrt(Math.max(0, sq / n - brightness * brightness));
  const sharpness = sharpnessOf(L, px.width, px.height);
  const upscale = px.width / sourceSide;
  const darkClip = dark / n;
  const lightClip = light / n;

  const issues: string[] = [];
  let score = 100;

  if (upscale > 1.6) {
    score -= 35;
    issues.push(`Photo trop petite (${sourceSide} px de côté) : agrandie ×${upscale.toFixed(1)}, elle paraîtra floue. Idéal : ${px.width} px ou plus.`);
  } else if (upscale > 1.05) {
    score -= 12;
    issues.push(`Photo légèrement agrandie (${sourceSide} px de côté, idéal ${px.width} px).`);
  }

  // Seuils calibrés sur les photos du catalogue (nettes : 23 à 118 ; floutées : 2 à 7)
  if (sharpness < 10) {
    score -= 45;
    issues.push("Image floue : mise au point ratée, bougé ou photo compressée.");
  } else if (sharpness < 20) {
    score -= 15;
    issues.push("Netteté moyenne : les détails du produit manquent de piqué.");
  }

  // Sombre ET peu contrastée = sous-exposée (une ambiance sombre voulue reste contrastée)
  if (brightness < 35 || (brightness < 60 && contrast < 30) || darkClip > 0.5) {
    score -= 25;
    issues.push("Photo trop sombre : éclaire davantage le produit.");
  } else if (brightness > 235 && contrast < 30) {
    score -= 15;
    issues.push("Photo surexposée : le produit se confond avec le fond.");
  }

  if (contrast < 22) {
    score -= 15;
    issues.push("Image terne (peu de contraste).");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade: QualityGrade = score >= 85 ? "excellente" : score >= 70 ? "bonne" : score >= 50 ? "moyenne" : "faible";
  return { score, grade, issues, fixes, metrics: { sourceSide, upscale, sharpness, brightness, contrast, darkClip, lightClip } };
}

/**
 * Niveaux automatiques : si la photo n'exploite pas toute la plage (voile
 * gris, manque de contraste), étire la luminance entre les percentiles 0,5 % et
 * 99,5 %. Même courbe pour R, V et B : les couleurs ne virent pas.
 * Renvoie true si une correction a été appliquée.
 */
export function autoLevels(px: Pixels): boolean {
  const { data } = px;
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) hist[Math.round(lum(data, i))]++;
  const n = data.length / 4;
  const pct = (q: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= n * q) return v;
    }
    return 255;
  };
  const lo = pct(0.005);
  const hi = pct(0.995);
  // Plage déjà correcte, ou image quasi uniforme : on ne touche à rien
  if ((lo <= 10 && hi >= 245) || hi - lo < 40) return false;
  const a = Math.min(lo, 30); // corrections bornées : jamais d'effet « filtre »
  const b = Math.max(hi, 225);
  const scale = 255 / (b - a);
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = (v - a) * scale;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
  return true;
}

/**
 * Accentuation (masque flou) légère, rayon 1 px : compense la douceur due à la
 * réduction de taille. Les zones unies (bruit, fond) sont ignorées (seuil).
 */
export function sharpen(px: Pixels, amount = 0.45, threshold = 3) {
  const { data, width, height } = px;
  const src = new Uint8ClampedArray(data);
  const row = width * 4;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * row + x * 4;
      for (let c = 0; c < 3; c++) {
        const k = i + c;
        // Flou 3 × 3 (centre 4, côtés 2, coins 1) / 16
        const blur =
          (4 * src[k] +
            2 * (src[k - 4] + src[k + 4] + src[k - row] + src[k + row]) +
            src[k - row - 4] + src[k - row + 4] + src[k + row - 4] + src[k + row + 4]) / 16;
        const diff = src[k] - blur;
        if (Math.abs(diff) > threshold) data[k] = src[k] + amount * diff;
      }
    }
  }
}

export const gradeLabel: Record<QualityGrade, string> = {
  excellente: "Excellente",
  bonne: "Bonne",
  moyenne: "Moyenne",
  faible: "Faible",
};
