# 🌿 Le Jardin d'Eïden

Boutique en ligne de produits de beauté (homme & femme) pour le Cameroun.
Catalogue, panier, commande, **paiement Mobile Money** et transmission de la
commande sur **WhatsApp** pour la préparation et la livraison.

Construit avec **Next.js 16** (App Router), **Drizzle ORM** + **PostgreSQL**,
et **Fapshi** pour le paiement MTN MoMo / Orange Money.

---

## 📁 Ce que fait la plateforme

- **Catalogue** : grille de produits, filtres par catégorie et par public (homme/femme/mixte), pages détail complètes (nom, prix, description, stock, image).
- **Panier** : ajout, modification des quantités, persistance locale (le panier survit au rafraîchissement).
- **Commande** : formulaire coordonnées + livraison, recalcul du total **côté serveur** (on ne fait jamais confiance au prix envoyé par le navigateur), vérification du stock.
- **Paiement Mobile Money** : redirection vers la page de paiement Fapshi (MTN MoMo / Orange Money).
- **Confirmation automatique** : un *webhook* Fapshi confirme le paiement, décrémente le stock (de façon **idempotente** : un webhook rejoué ne décrémente pas deux fois), puis génère le lien WhatsApp.
- **WhatsApp** : après paiement, un bouton ouvre WhatsApp avec la commande déjà rédigée (produits, quantités, total, client, adresse) à envoyer à ton équipe.
- **Admin** : espace protégé pour gérer les produits (créer, modifier, masquer, supprimer, stock, prix, mise en avant) et suivre les commandes (statut de préparation, lien WhatsApp).
- **SEO / pubs** : chaque page produit a ses métadonnées Open Graph et des données structurées (`schema.org/Product`) → les liens partagés dans tes pubs affichent un bel aperçu et ramènent vers la fiche produit.

---

## 🚀 Mise en ligne (étape par étape)

### 1. Base de données PostgreSQL gratuite (Neon)

1. Crée un compte sur **https://neon.tech** (gratuit).
2. Crée un projet → copie l'**URL de connexion** (commence par `postgresql://...?sslmode=require`).
3. Garde-la pour l'étape 4 (`DATABASE_URL`).

> Alternative : Supabase (https://supabase.com), même principe.

### 2. Compte marchand Fapshi (paiement Mobile Money)

1. Crée un compte sur **https://fapshi.com** et fais activer ton compte marchand.
2. Crée un *service* (type **Collection**) dans le tableau de bord.
3. Récupère tes identifiants API : **`apiuser`** et **`apikey`** (il y en a un jeu pour le *sandbox* de test et un autre pour le *live*).
4. Dans les réglages du service, configure :
   - **Webhook URL** : `https://TON-DOMAINE/api/webhook/fapshi`
   - **Webhook secret** (recommandé) : une chaîne secrète → à mettre dans `FAPSHI_WEBHOOK_SECRET`.

Docs Fapshi : https://docs.fapshi.com

### 3. Numéro WhatsApp

Prends le numéro WhatsApp qui recevra les commandes, au format **international sans le `+`** :
Cameroun → `2376XXXXXXXX` (ex : `237690112233`).

### 4. Déploiement sur Vercel (gratuit)

1. Pousse ce dossier sur un dépôt GitHub.
2. Va sur **https://vercel.com** → *New Project* → importe le dépôt.
3. Dans **Environment Variables**, ajoute (voir `.env.example`) :

   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | l'URL Neon de l'étape 1 |
   | `NEXT_PUBLIC_SITE_NAME` | `Le Jardin d'Eïden` |
   | `NEXT_PUBLIC_SITE_URL` | `https://ton-domaine.vercel.app` |
   | `NEXT_PUBLIC_CURRENCY` | `FCFA` |
   | `WHATSAPP_BUSINESS_NUMBER` | ton numéro (ex `237690112233`) |
   | `FAPSHI_API_USER` | ton apiuser Fapshi |
   | `FAPSHI_API_KEY` | ton apikey Fapshi |
   | `FAPSHI_ENV` | `sandbox` pour tester, `live` en production |
   | `FAPSHI_WEBHOOK_SECRET` | le secret configuré chez Fapshi |
   | `ADMIN_EMAIL` | ton email admin |
   | `ADMIN_PASSWORD` | un mot de passe fort |
   | `ADMIN_SESSION_SECRET` | une longue chaîne aléatoire (voir ci-dessous) |

   Génère un secret : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **Déploie.** Puis, une seule fois, applique le schéma et crée les données de départ (depuis ton PC, avec le `DATABASE_URL` de Neon dans `.env`) :

   ```bash
   npm run db:push     # crée les tables
   npm run db:seed     # catégories + produits de démo + compte admin
   ```

5. Mets à jour `NEXT_PUBLIC_SITE_URL` avec ton vrai domaine et redéploie.

### 5. Teste le parcours

1. Ouvre le site, ajoute un produit au panier, passe commande.
2. Avec `FAPSHI_ENV=sandbox`, utilise les numéros de test Fapshi pour simuler un paiement.
3. Vérifie que la page `/commande/...` passe en « Paiement confirmé » et affiche le bouton WhatsApp.
4. Connecte-toi à l'admin sur `/admin/login` et retrouve la commande.

---

## 🛠️ Développement local

```bash
npm install
cp .env.example .env     # puis renseigne DATABASE_URL (une base PostgreSQL locale ou Neon)
npm run db:push          # crée les tables
npm run db:seed          # données de démo
npm run dev              # http://localhost:3000
```

Admin : `/admin/login` (identifiants = `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

### Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run start` | lance le build de production |
| `npm run db:push` | applique le schéma Drizzle à la base |
| `npm run db:seed` | insère catégories, produits de démo et admin |
| `npm run db:studio` | ouvre Drizzle Studio (explorateur de base) |

---

## 📢 Faire de la publicité (liens cliquables vers la boutique)

Pour tes campagnes dans les applications/réseaux utilisés au Cameroun :

- **Lien vers un produit** : `https://ton-domaine/produit/NOM-DU-PRODUIT`
  → le client arrive directement sur la fiche, ajoute au panier, commande.
- **Lien vers une sélection** : `https://ton-domaine/?pour=FEMME` ou `?pour=HOMME`, ou `?cat=parfums` (voir les catégories).
- **Aperçu riche** : chaque fiche produit expose déjà son titre, sa description et son image (Open Graph). Quand tu colles le lien dans une pub, un message WhatsApp ou Facebook, un aperçu s'affiche automatiquement.

> ⚠️ **Astuce aperçu** : les images de démo sont en SVG, que certaines plateformes n'affichent pas dans les aperçus de lien. Dès que tu remplaces par de **vraies photos (JPG/PNG)** via l'admin, les aperçus de tes pubs seront parfaits.

---

## 🧱 Architecture (pour s'y retrouver dans le code)

```
app/
  page.tsx                  Accueil + catalogue (filtres)
  produit/[slug]/           Fiche produit détaillée (+ métadonnées pub)
  panier/                   Panier
  checkout/                 Formulaire de commande + action serveur
  commande/[id]/            Suivi de paiement + bouton WhatsApp
  admin/                    Espace admin (login, produits, commandes)
  api/webhook/fapshi/       Réception des confirmations de paiement
lib/
  db/            schéma Drizzle, connexion, seed
  payment/       adaptateur Fapshi (interface générique → facile à changer)
  orders.ts      création commande, confirmation paiement, stock (idempotent)
  whatsapp.ts    génération du message et du lien WhatsApp
  auth.ts        session admin (cookie signé)
  queries.ts     lecture des produits/catégories
components/       en-tête, pied de page, panier (contexte), cartes produit...
```

### Changer d'agrégateur de paiement

Tout le paiement passe par l'interface `PaymentProvider` (`lib/payment/types.ts`).
Pour passer de Fapshi à **Campay**, **Notch Pay** ou **MeSomb** : crée un
`lib/payment/campay.ts` qui implémente la même interface, puis change la ligne
d'export dans `lib/payment/index.ts`. Le reste de l'app ne bouge pas.

### Passer WhatsApp en envoi 100% automatique

Aujourd'hui, après paiement, un **lien pré-rempli** ouvre WhatsApp avec la
commande (gratuit, zéro config). Pour un envoi automatique vers ton numéro sans
clic, branche l'**API WhatsApp Business** (Meta Cloud API) dans
`lib/whatsapp.ts` : ajoute une fonction qui POST le message via l'API, et
appelle-la dans le webhook `api/webhook/fapshi` quand le paiement réussit.
Cela demande un compte WhatsApp Business et la validation d'un numéro par Meta.

---

## 💰 Prix affichés

Tous les montants sont en **FCFA**, stockés en entiers (pas de centimes). La
livraison est fixée à 0 par défaut et confirmée avec le client sur WhatsApp
selon sa zone — tu peux la rendre automatique plus tard dans `lib/orders.ts`.
