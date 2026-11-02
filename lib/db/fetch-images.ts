// Télécharge les médias de TEST des produits et les affiches de l'accueil,
// puis met à jour la base :
// - photos Pexels (licence libre, sans clé d'API) recadrées en 1000×1000
// - courtes vidéos Mixkit (licence libre) en 720p, avec image d'aperçu
// Les fichiers déjà présents ne sont pas retéléchargés.
// Lancer : npm run images              (npm run images -- --force pour tout refaire)
// Pour changer une photo : remplacer son identifiant ci-dessous (le nombre à la
// fin de l'adresse d'une photo sur pexels.com) puis relancer avec --force.
import "dotenv/config";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, like, or } from "drizzle-orm";
import { db } from "./index";
import { productImages } from "./schema";
import { mediaRows, photoFile, PRODUCTS_DIR } from "./media";

// Clé = nom de fichier (identique au champ `img` du seed), valeur = ids photos
// Pexels, dans l'ordre du carrousel. Photos de TEST (certaines montrent des
// marques) : à remplacer par les vraies photos des produits.
const photos: Record<string, number[]> = {
  "serum-vitamine-c": [11124447, 7020055, 5113049, 4841179], // sérum vit. C aux oranges
  "creme-nuit-karite": [5911998, 4173450, 4841224, 14473476], // pots de crème
  "beurre-karite": [17596984, 17596986, 17596985, 7234495], // beurres corporels
  "gel-douche-hibiscus": [8634408, 8634417, 8634415, 6940685], // flacons pompe + hibiscus
  "huile-ricin-coco": [14656188, 18066457, 39281916, 14656279], // huiles capillaires
  "masque-capillaire": [19644201, 4841466, 4841518, 36339062], // pots de soin
  "parfum-homme-ambre": [36339051, 12456284, 12456283, 6958875], // flacons boisés/ambrés
  "parfum-femme-tiare": [16722501, 3989394, 16722405, 19644207], // parfums floraux
  "rouge-levres-mat": [14444882, 7664873, 7810602, 7810600], // rouges à lèvres
  "fond-de-teint": [14453472, 6527699, 6527700, 10044948], // fond de teint, maquillage
  "savon-noir": [16556478, 6930879, 29502137, 16263605], // savon charbon + artisanaux
  "apres-rasage": [8789590, 8789597, 8789600, 14649394], // rasage et après-rasage
  "nettoyant-charbon-homme": [7433338, 12322943],
  "creme-hydratante-homme": [7433336, 13472061, 7608053],
  "eau-micellaire": [3764016, 4202383],
  "masque-argile": [6167443, 6978043, 4148921, 3762642],
  "contour-yeux": [8490089, 6690234, 8101587],
  "lait-corps-cacao": [5798000, 6976293, 18996281],
  "deodorant-homme": [30353208, 5983408],
  "gommage-cafe": [7795646, 6621308, 10574793],
  "huile-seche-corps": [10186829, 4465828, 10815265],
  "shampoing-homme": [17576517, 29611521],
  "cire-coiffante": [6487906, 7447125],
  "creme-boucles": [9775318],
  "shampoing-doux": [3872898, 7262767],
  "parfum-homme-agrumes": [14211239, 30970928, 30970926],
  "parfum-femme-vanille": [8166613, 16967183, 12741172],
  "brume-corps": [29022733, 16722405],
  "parfum-homme-oud": [17978253, 16239693, 36779953],
  mascara: [4938457, 2688992, 7712436],
  "palette-fards": [1339340, 6662437, 2113855],
  gloss: [8145764, 3373740, 4889707],
  "huile-barbe": [9714438, 17924227, 9395856],
  "soin-barbe": [3809176, 12558712],
  "creme-raser": [7320168, 6336839],
  "rasoir-coupe-chou": [9456810, 12339151],

  // ── Hygiène dentaire ──
  "dentifrice-blancheur": [4202927, 4465814],
  "dentifrice-charbon": [8191884, 3654607],
  "brosse-bambou": [5478207, 8103082, 3654597],
  "brosse-souple": [13579612],
  "bain-bouche": [8704810],
  "dentifrice-enfant": [10566161, 6543057, 7086239],
  "brosses-enfant": [7263032, 6224241, 4546138],

  // ── Enfants ──
  "shampoing-enfant": [13893108],
  "gel-douche-enfant": [12595007],
  "lait-enfant": [5798000],
  "creme-tresses-fille": [37489452, 6999278],
  "cologne-fille": [7358338, 13870928],
  "cologne-garcon": [10970775, 4384288],
  "gel-coiffant-garcon": [16577317, 7970114],
};

// Courtes vidéos Mixkit : clé produit → id vidéo (assets.mixkit.co/videos/<id>)
const videos: Record<string, number> = {
  "parfum-femme-tiare": 20766, // pression sur un flacon de parfum
  "rouge-levres-mat": 371, // application de rouge à lèvres
  mascara: 367, // application de mascara
  "palette-fards": 52033, // trousse de maquillage
  "shampoing-homme": 33098, // homme qui se lave les cheveux
  "gel-douche-enfant": 14581, // fillette dans un bain moussant
  "savon-noir": 2812, // savons artisanaux
  "creme-nuit-karite": 50426, // application de crème hydratante
  "eau-micellaire": 51169, // brume d'eau micellaire
  "masque-argile": 51180, // application d'un masque
  "dentifrice-blancheur": 48930, // dentifrice sur la brosse
  "brosse-bambou": 36105, // brossage de dents
  "shampoing-doux": 16189, // cheveux longs
};

// Affiches de la page d'accueil (public/brand/posters/<clé>.jpg) : [id, largeur, hauteur]
const posters: Record<string, [number, number, number]> = {
  "pour-elle": [5938286, 1200, 1200],
  "pour-lui": [15946547, 1200, 1200],
  "pour-enfants": [19619791, 1200, 1200],
  "banniere-elle": [3764016, 1800, 800],
  "banniere-lui": [2881253, 1800, 800],
  "banniere-parfums": [36339051, 1800, 800],
  "banniere-enfants": [31685325, 1800, 800],
  "soins-visage": [6978043, 900, 1100],
  "soins-corps": [7795646, 900, 1100],
  cheveux: [9775318, 900, 1100],
  parfums: [16722501, 900, 1100],
  maquillage: [1339340, 900, 1100],
  "barbe-rasage": [9714438, 900, 1100],
  "hygiene-dentaire": [4465814, 900, 1100],
};

const force = process.argv.includes("--force");

/** Télécharge `url` vers `file` sauf s'il existe déjà ; renvoie true si téléchargé */
async function download(url: string, file: string) {
  if (!force && existsSync(file)) return false;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${path.basename(file)} : ${res.status} (${url})`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

const pexels = (id: number, w: number, h: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

async function main() {
  const videoDir = path.join(PRODUCTS_DIR, "videos");
  const posterDir = path.join(process.cwd(), "public", "brand", "posters");
  await Promise.all([mkdir(videoDir, { recursive: true }), mkdir(posterDir, { recursive: true })]);
  const credits: Record<string, string[]> = {};
  let downloaded = 0;

  for (const [slug, ids] of Object.entries(photos)) {
    for (const [i, id] of ids.entries()) {
      if (await download(pexels(id, 1000, 1000), path.join(PRODUCTS_DIR, photoFile(slug, i)))) downloaded++;
    }
    credits[slug] = ids.map((id) => `https://www.pexels.com/photo/${id}/`);

    const videoId = videos[slug];
    if (videoId) {
      const base = `https://assets.mixkit.co/videos/${videoId}/${videoId}`;
      if (await download(`${base}-720.mp4`, path.join(videoDir, `${slug}.mp4`))) downloaded++;
      await download(`${base}-thumb-720-0.jpg`, path.join(videoDir, `${slug}.jpg`)).catch(() =>
        download(`${base}-thumb-360-0.jpg`, path.join(videoDir, `${slug}.jpg`))
      );
      credits[slug].push(`https://mixkit.co/free-stock-video/${videoId}/`);
    }

    // Retrouve le produit via sa 1re image, puis remplace tous ses médias
    const current = await db.query.productImages.findFirst({
      where: or(
        eq(productImages.url, `/products/${slug}.svg`),
        eq(productImages.url, `/products/${slug}.jpg`)
      ),
    });
    if (!current) {
      console.log(`✓ ${slug} — fichiers seulement (produit absent de la base)`);
      continue;
    }
    await db
      .delete(productImages)
      .where(
        and(
          eq(productImages.productId, current.productId),
          or(like(productImages.url, `/products/${slug}%`), like(productImages.url, `/products/videos/${slug}.%`))
        )
      );
    const rows = mediaRows(slug, current.productId, current.alt);
    await db.insert(productImages).values(rows);
    console.log(`✓ ${slug} — ${rows.length} média(s)${videoId ? " dont 1 vidéo" : ""}`);
  }

  for (const [key, [id, w, h]] of Object.entries(posters)) {
    if (await download(pexels(id, w, h), path.join(posterDir, `${key}.jpg`))) downloaded++;
    credits[`affiche-${key}`] = [`https://www.pexels.com/photo/${id}/`];
  }

  await writeFile(path.join(PRODUCTS_DIR, "credits.json"), JSON.stringify(credits, null, 2) + "\n");
  console.log(`✅ Médias à jour (${downloaded} fichier(s) téléchargé(s))`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Erreur médias :", e);
  process.exit(1);
});
