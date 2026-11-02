// Seed : crée des catégories, produits de démo et le compte admin.
// Lancer : npm run db:seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import { mediaRows } from "./media";
import { db } from "./index";
import { categories, products, productImages, adminUsers } from "./schema";
import { slugify } from "../utils";

async function main() {
  console.log("🌱 Seed en cours...");

  // ─── Compte admin ───
  const adminEmail = process.env.ADMIN_EMAIL || "admin@jardin-eiden.cm";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await db
    .insert(adminUsers)
    .values({ email: adminEmail, passwordHash, name: "Admin" })
    .onConflictDoNothing();
  console.log(`✓ Admin : ${adminEmail}`);

  // ─── Catégories ───
  const cats = [
    "Soins visage",
    "Soins corps",
    "Cheveux",
    "Parfums",
    "Maquillage",
    "Barbe & rasage",
    "Hygiène dentaire",
    // Homme, femme et enfant : le public est porté par chaque produit
    "Chaussures",
  ];
  const catRows = [];
  for (const name of cats) {
    const [row] = await db
      .insert(categories)
      .values({ name, slug: slugify(name) })
      .onConflictDoNothing()
      .returning();
    if (row) catRows.push(row);
  }
  // Recharge toutes les catégories (au cas où elles existaient déjà)
  const allCats = await db.select().from(categories);
  const catBySlug = Object.fromEntries(allCats.map((c) => [c.slug, c]));
  console.log(`✓ ${allCats.length} catégories`);

  // ─── Produits de démo ───
  const demo = [
    {
      name: "Sérum éclat à la vitamine C",
      categorySlug: "soins-visage",
      audience: "FEMME" as const,
      price: 12000,
      stock: 25,
      featured: true,
      description:
        "Sérum concentré en vitamine C pour unifier le teint, atténuer les taches et redonner de l'éclat. Application matin et soir sur peau propre. Flacon 30 ml.",
      img: "serum-vitamine-c",
    },
    {
      name: "Crème hydratante nuit karité & argan",
      categorySlug: "soins-visage",
      audience: "UNISEXE" as const,
      price: 9500,
      stock: 40,
      featured: true,
      description:
        "Crème de nuit nourrissante au beurre de karité et huile d'argan. Répare et hydrate intensément pendant le sommeil. Convient à tous types de peau. Pot 50 ml.",
      img: "creme-nuit-karite",
    },
    {
      name: "Beurre de karité pur 100% naturel",
      categorySlug: "soins-corps",
      audience: "UNISEXE" as const,
      price: 5000,
      stock: 60,
      featured: false,
      description:
        "Beurre de karité brut non raffiné, idéal pour le corps, les cheveux et les peaux sèches. Produit localement. Pot 250 g.",
      img: "beurre-karite",
    },
    {
      name: "Gel douche parfumé fleur d'hibiscus",
      categorySlug: "soins-corps",
      audience: "FEMME" as const,
      price: 4500,
      stock: 35,
      featured: false,
      description:
        "Gel douche doux au parfum d'hibiscus, nettoie en préservant le film hydrolipidique de la peau. Flacon 500 ml.",
      img: "gel-douche-hibiscus",
    },
    {
      name: "Huile capillaire fortifiante ricin & coco",
      categorySlug: "cheveux",
      audience: "UNISEXE" as const,
      price: 6500,
      stock: 50,
      featured: true,
      description:
        "Mélange d'huile de ricin et de coco pour fortifier, faire pousser et nourrir les cheveux. Appliquer sur cuir chevelu et longueurs. Flacon 100 ml.",
      img: "huile-ricin-coco",
    },
    {
      name: "Masque capillaire réparateur",
      categorySlug: "cheveux",
      audience: "FEMME" as const,
      price: 7000,
      stock: 20,
      featured: false,
      description:
        "Masque intense pour cheveux abîmés et cassants. Répare la fibre et apporte brillance. Poser 15 min puis rincer. Pot 300 ml.",
      img: "masque-capillaire",
    },
    {
      name: "Eau de parfum homme — Bois ambré",
      categorySlug: "parfums",
      audience: "HOMME" as const,
      price: 18000,
      stock: 15,
      featured: true,
      description:
        "Fragrance boisée et ambrée, élégante et tenace. Notes de tête épicées, cœur boisé, fond ambré. Vaporisateur 100 ml.",
      img: "parfum-homme-ambre",
    },
    {
      name: "Eau de parfum femme — Fleur de tiaré",
      categorySlug: "parfums",
      audience: "FEMME" as const,
      price: 18000,
      stock: 15,
      featured: true,
      description:
        "Parfum floral solaire à la fleur de tiaré, frais et enveloppant. Idéal au quotidien. Vaporisateur 100 ml.",
      img: "parfum-femme-tiare",
    },
    {
      name: "Rouge à lèvres mat longue tenue",
      categorySlug: "maquillage",
      audience: "FEMME" as const,
      price: 5500,
      stock: 45,
      featured: false,
      description:
        "Rouge à lèvres au fini mat, couleur intense et tenue longue durée sans dessécher. Plusieurs teintes disponibles sur demande.",
      img: "rouge-levres-mat",
    },
    {
      name: "Fond de teint fluide peaux mates",
      categorySlug: "maquillage",
      audience: "FEMME" as const,
      price: 11000,
      stock: 30,
      featured: false,
      description:
        "Fond de teint fluide couvrance moyenne à modulable, formulé pour les carnations mates et foncées. Fini naturel. Flacon 30 ml.",
      img: "fond-de-teint",
    },
    {
      name: "Savon noir exfoliant traditionnel",
      categorySlug: "soins-corps",
      audience: "UNISEXE" as const,
      price: 3500,
      stock: 70,
      featured: false,
      description:
        "Savon noir africain authentique, nettoie et exfolie en douceur. Laisse la peau nette et lisse. Pain 150 g.",
      img: "savon-noir",
    },
    {
      name: "Baume après-rasage apaisant homme",
      categorySlug: "soins-visage",
      audience: "HOMME" as const,
      price: 6000,
      stock: 28,
      featured: false,
      description:
        "Baume après-rasage non gras qui apaise les irritations et hydrate la peau. Sans alcool. Tube 100 ml.",
      img: "apres-rasage",
    },

    // ─── Soins visage ───
    {
      name: "Nettoyant visage purifiant au charbon",
      categorySlug: "soins-visage",
      audience: "HOMME" as const,
      price: 6500,
      stock: 40,
      featured: true,
      description:
        "Gel nettoyant au charbon actif qui désincruste les pores et élimine l'excès de sébum. Peau nette et fraîche dès le matin. Tube 150 ml.",
      img: "nettoyant-charbon-homme",
    },
    {
      name: "Crème hydratante matifiante homme",
      categorySlug: "soins-visage",
      audience: "HOMME" as const,
      price: 8500,
      stock: 30,
      featured: false,
      description:
        "Hydratation 24 h, texture légère non grasse et fini mat. Apaise le feu du rasoir et protège la peau du dessèchement. Pot 50 ml.",
      img: "creme-hydratante-homme",
    },
    {
      name: "Eau micellaire douceur à la rose",
      categorySlug: "soins-visage",
      audience: "FEMME" as const,
      price: 5500,
      stock: 45,
      featured: false,
      description:
        "Démaquille, nettoie et tonifie en un seul geste, sans rinçage. À l'eau de rose apaisante, convient aux peaux sensibles. Flacon 400 ml.",
      img: "eau-micellaire",
    },
    {
      name: "Masque purifiant à l'argile verte",
      categorySlug: "soins-visage",
      audience: "UNISEXE" as const,
      price: 6000,
      stock: 35,
      featured: false,
      description:
        "Masque à l'argile verte qui absorbe les impuretés et resserre les pores. Laisser poser 10 minutes, 1 à 2 fois par semaine. Pot 100 g.",
      img: "masque-argile",
    },
    {
      name: "Soin contour des yeux anti-cernes",
      categorySlug: "soins-visage",
      audience: "FEMME" as const,
      price: 9000,
      stock: 25,
      featured: false,
      description:
        "Crème légère à la caféine qui atténue cernes et poches et lisse les ridules du regard. Appliquer matin et soir en tapotant. Pot 15 ml.",
      img: "contour-yeux",
    },

    // ─── Soins corps ───
    {
      name: "Lait corporel au beurre de cacao",
      categorySlug: "soins-corps",
      audience: "FEMME" as const,
      price: 5500,
      stock: 50,
      featured: false,
      description:
        "Lait nourrissant au beurre de cacao pour une peau douce, souple et délicatement parfumée. Pénètre rapidement. Flacon pompe 400 ml.",
      img: "lait-corps-cacao",
    },
    {
      name: "Déodorant homme 48 h fraîcheur",
      categorySlug: "soins-corps",
      audience: "HOMME" as const,
      price: 3500,
      stock: 80,
      featured: false,
      description:
        "Protection efficace 48 h contre la transpiration et les odeurs, sans traces blanches. Parfum frais et boisé. Spray 150 ml.",
      img: "deodorant-homme",
    },
    {
      name: "Gommage corps au café",
      categorySlug: "soins-corps",
      audience: "UNISEXE" as const,
      price: 5000,
      stock: 40,
      featured: true,
      description:
        "Gommage au marc de café et à l'huile de coco : exfolie, tonifie et laisse la peau lisse et satinée. Pot 250 g.",
      img: "gommage-cafe",
    },
    {
      name: "Huile sèche corps éclat doré",
      categorySlug: "soins-corps",
      audience: "FEMME" as const,
      price: 8000,
      stock: 30,
      featured: false,
      description:
        "Huile sèche aux reflets dorés qui sublime le teint et nourrit sans effet gras. Pour le corps et les cheveux. Flacon 100 ml.",
      img: "huile-seche-corps",
    },

    // ─── Cheveux ───
    {
      name: "Shampoing fortifiant homme",
      categorySlug: "cheveux",
      audience: "HOMME" as const,
      price: 4500,
      stock: 45,
      featured: false,
      description:
        "Shampoing à la caféine et au ginseng qui renforce le cheveu et stimule le cuir chevelu. Usage quotidien. Flacon 250 ml.",
      img: "shampoing-homme",
    },
    {
      name: "Cire coiffante fixation naturelle",
      categorySlug: "cheveux",
      audience: "HOMME" as const,
      price: 4000,
      stock: 35,
      featured: false,
      description:
        "Cire mate à tenue modulable pour sculpter et texturer la coiffure toute la journée. Se rince facilement. Pot 100 g.",
      img: "cire-coiffante",
    },
    {
      name: "Crème définition boucles",
      categorySlug: "cheveux",
      audience: "FEMME" as const,
      price: 6500,
      stock: 30,
      featured: true,
      description:
        "Crème sans rinçage qui définit, hydrate et discipline les boucles et cheveux crépus, sans effet carton. Pot 250 ml.",
      img: "creme-boucles",
    },
    {
      name: "Shampoing doux sans sulfate",
      categorySlug: "cheveux",
      audience: "UNISEXE" as const,
      price: 5000,
      stock: 40,
      featured: false,
      description:
        "Shampoing doux sans sulfate ni silicone, respecte le cuir chevelu et la fibre. Idéal pour les lavages fréquents. Flacon 300 ml.",
      img: "shampoing-doux",
    },

    // ─── Parfums ───
    {
      name: "Eau de toilette homme — Agrumes frais",
      categorySlug: "parfums",
      audience: "HOMME" as const,
      price: 15000,
      stock: 20,
      featured: false,
      description:
        "Fragrance fraîche et énergisante : bergamote, citron vert et vétiver. Parfaite pour la journée. Vaporisateur 100 ml.",
      img: "parfum-homme-agrumes",
    },
    {
      name: "Eau de parfum femme — Vanille gourmande",
      categorySlug: "parfums",
      audience: "FEMME" as const,
      price: 17000,
      stock: 20,
      featured: true,
      description:
        "Sillage chaleureux et enveloppant : vanille bourbon, fève tonka et fleur d'oranger. Vaporisateur 100 ml.",
      img: "parfum-femme-vanille",
    },
    {
      name: "Brume parfumée corps & cheveux",
      categorySlug: "parfums",
      audience: "FEMME" as const,
      price: 6000,
      stock: 40,
      featured: false,
      description:
        "Brume légère aux notes fruitées et florales pour parfumer corps et cheveux tout au long de la journée. Spray 250 ml.",
      img: "brume-corps",
    },
    {
      name: "Eau de parfum homme — Oud intense",
      categorySlug: "parfums",
      audience: "HOMME" as const,
      price: 22000,
      stock: 12,
      featured: true,
      description:
        "Parfum oriental puissant : bois de oud, ambre et cuir. Tenue exceptionnelle pour les grandes occasions. Vaporisateur 100 ml.",
      img: "parfum-homme-oud",
    },

    // ─── Maquillage ───
    {
      name: "Mascara volume intense",
      categorySlug: "maquillage",
      audience: "FEMME" as const,
      price: 4500,
      stock: 50,
      featured: false,
      description:
        "Mascara noir intense qui allonge et densifie les cils dès la première application, sans paquets. Tenue 12 h.",
      img: "mascara",
    },
    {
      name: "Palette fards à paupières nude",
      categorySlug: "maquillage",
      audience: "FEMME" as const,
      price: 9500,
      stock: 25,
      featured: false,
      description:
        "12 teintes mates et irisées, des nudes aux bruns profonds, pour des regards du naturel au smoky. Pigmentation intense.",
      img: "palette-fards",
    },
    {
      name: "Gloss repulpant brillant",
      categorySlug: "maquillage",
      audience: "FEMME" as const,
      price: 3500,
      stock: 60,
      featured: false,
      description:
        "Gloss non collant à l'effet repulpant, pour des lèvres brillantes et hydratées. Plusieurs teintes disponibles.",
      img: "gloss",
    },

    // ─── Barbe & rasage ───
    {
      name: "Huile à barbe nourrissante",
      categorySlug: "barbe-rasage",
      audience: "HOMME" as const,
      price: 6000,
      stock: 35,
      featured: true,
      description:
        "Huile à l'argan et au jojoba qui adoucit la barbe, nourrit la peau et calme les démangeaisons. Flacon compte-gouttes 30 ml.",
      img: "huile-barbe",
    },
    {
      name: "Soin conditionnant barbe",
      categorySlug: "barbe-rasage",
      audience: "HOMME" as const,
      price: 5500,
      stock: 30,
      featured: false,
      description:
        "Soin démêlant pour barbe longue : discipline les poils rebelles et apporte brillance et douceur. Flacon 100 ml.",
      img: "soin-barbe",
    },
    {
      name: "Crème à raser onctueuse",
      categorySlug: "barbe-rasage",
      audience: "HOMME" as const,
      price: 4000,
      stock: 45,
      featured: false,
      description:
        "Crème riche qui forme une mousse dense au blaireau pour un rasage précis et sans irritation. Pot 150 ml.",
      img: "creme-raser",
    },
    {
      name: "Rasoir coupe-chou traditionnel",
      categorySlug: "barbe-rasage",
      audience: "HOMME" as const,
      price: 12000,
      stock: 15,
      featured: false,
      description:
        "Rasoir coupe-chou en acier inoxydable et manche en bois, pour un rasage de près à l'ancienne. Livré avec étui.",
      img: "rasoir-coupe-chou",
    },

    // ─── Hygiène dentaire (adultes) ───
    {
      name: "Dentifrice blancheur menthe fraîche",
      categorySlug: "hygiene-dentaire",
      audience: "UNISEXE" as const,
      price: 1500,
      stock: 120,
      featured: false,
      description:
        "Dentifrice au fluor qui élimine les taches et protège contre les caries. Haleine fraîche longue durée. Tube 100 ml.",
      img: "dentifrice-blancheur",
    },
    {
      name: "Dentifrice au charbon actif",
      categorySlug: "hygiene-dentaire",
      audience: "UNISEXE" as const,
      price: 2000,
      stock: 80,
      featured: false,
      description:
        "Dentifrice noir au charbon végétal qui absorbe les impuretés et ravive la blancheur naturelle des dents. Tube 75 ml.",
      img: "dentifrice-charbon",
    },
    {
      name: "Brosses à dents en bambou (lot de 4)",
      categorySlug: "hygiene-dentaire",
      audience: "UNISEXE" as const,
      price: 3000,
      stock: 60,
      featured: true,
      description:
        "Manche en bambou biodégradable et poils souples. Un geste simple pour la planète, une couleur par membre de la famille.",
      img: "brosse-bambou",
    },
    {
      name: "Brosse à dents souple protection gencives",
      categorySlug: "hygiene-dentaire",
      audience: "UNISEXE" as const,
      price: 1500,
      stock: 90,
      featured: false,
      description:
        "Poils extra-souples et tête compacte pour nettoyer en profondeur sans irriter les gencives sensibles.",
      img: "brosse-souple",
    },
    {
      name: "Bain de bouche fraîcheur 24 h",
      categorySlug: "hygiene-dentaire",
      audience: "UNISEXE" as const,
      price: 2500,
      stock: 50,
      featured: false,
      description:
        "Bain de bouche sans alcool qui élimine 99 % des bactéries et protège l'haleine jusqu'à 24 h. Flacon 500 ml.",
      img: "bain-bouche",
    },

    // ─── Enfants ───
    {
      name: "Dentifrice enfant goût fraise",
      categorySlug: "hygiene-dentaire",
      audience: "ENFANT" as const,
      price: 1500,
      stock: 80,
      featured: true,
      description:
        "Dentifrice doux au fluor adapté aux dents de lait, au bon goût de fraise. Dès 3 ans. Tube 50 ml.",
      img: "dentifrice-enfant",
    },
    {
      name: "Brosses à dents enfant colorées (lot de 2)",
      categorySlug: "hygiene-dentaire",
      audience: "ENFANT" as const,
      price: 2000,
      stock: 70,
      featured: false,
      description:
        "Petites têtes et poils extra-souples, manches colorés pour rendre le brossage amusant. De 3 à 8 ans.",
      img: "brosses-enfant",
    },
    {
      name: "Shampoing démêlant enfant sans larmes",
      categorySlug: "cheveux",
      audience: "ENFANT" as const,
      price: 3500,
      stock: 50,
      featured: false,
      description:
        "Formule douce qui ne pique pas les yeux et facilite le démêlage des cheveux bouclés et crépus. Flacon 300 ml.",
      img: "shampoing-enfant",
    },
    {
      name: "Crème coiffante tresses & nattes fillette",
      categorySlug: "cheveux",
      audience: "FILLE" as const,
      price: 3500,
      stock: 40,
      featured: true,
      description:
        "Crème légère au karité qui nourrit le cuir chevelu et fait briller tresses, nattes et vanilles. Pot 200 ml.",
      img: "creme-tresses-fille",
    },
    {
      name: "Gel coiffant garçon fixation douce",
      categorySlug: "cheveux",
      audience: "GARCON" as const,
      price: 2500,
      stock: 45,
      featured: false,
      description:
        "Gel sans alcool qui fixe la coiffure toute la journée et s'élimine à l'eau. Doux pour le cuir chevelu des enfants. Pot 150 ml.",
      img: "gel-coiffant-garcon",
    },
    {
      name: "Gel douche & bain moussant enfant",
      categorySlug: "soins-corps",
      audience: "ENFANT" as const,
      price: 3000,
      stock: 55,
      featured: false,
      description:
        "Gel 2-en-1 douche et bain moussant au pH neutre, parfum fruité. Le bain devient un jeu ! Flacon 400 ml.",
      img: "gel-douche-enfant",
    },
    {
      name: "Lait hydratant enfant au karité",
      categorySlug: "soins-corps",
      audience: "ENFANT" as const,
      price: 3500,
      stock: 50,
      featured: false,
      description:
        "Lait très doux au beurre de karité qui protège la peau sensible des enfants du dessèchement. Sans parfum. Flacon 250 ml.",
      img: "lait-enfant",
    },
    {
      name: "Eau de cologne fillette — Fleurs douces",
      categorySlug: "parfums",
      audience: "FILLE" as const,
      price: 4500,
      stock: 30,
      featured: false,
      description:
        "Cologne légère et sans alcool aux notes de fleurs blanches et de fruits rouges, spécialement conçue pour les petites filles. 50 ml.",
      img: "cologne-fille",
    },
    {
      name: "Eau de cologne garçon — Fraîcheur sport",
      categorySlug: "parfums",
      audience: "GARCON" as const,
      price: 4500,
      stock: 30,
      featured: false,
      description:
        "Cologne fraîche et sans alcool aux notes d'agrumes et de menthe pour les petits garçons pleins d'énergie. 50 ml.",
      img: "cologne-garcon",
    },
  ];

  let count = 0;
  for (const p of demo) {
    const cat = catBySlug[p.categorySlug];
    const slug = slugify(p.name);
    const [row] = await db
      .insert(products)
      .values({
        name: p.name,
        slug,
        description: p.description,
        price: p.price,
        stock: p.stock,
        audience: p.audience,
        isFeatured: p.featured,
        // Démo : publiée d'office (un produit créé dans l'admin naît brouillon)
        isActive: true,
        publishedAt: new Date(),
        categoryId: cat?.id ?? null,
      })
      .onConflictDoNothing()
      .returning();

    if (row) {
      // Photos et vidéo téléchargées (npm run images), sinon placeholder SVG
      await db.insert(productImages).values(mediaRows(p.img, row.id, p.name));
      count++;
    }
  }
  console.log(`✓ ${count} produits créés`);
  console.log("✅ Seed terminé");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Erreur seed :", e);
  process.exit(1);
});
