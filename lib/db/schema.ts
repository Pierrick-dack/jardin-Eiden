// Le Jardin d'Eïden — schéma de base de données (Drizzle ORM)
// Boutique de produits de beauté H&F — paiement Mobile Money + workflow WhatsApp

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ─── Enums ──────────────────────────────────────────────

// UNISEXE = adulte mixte ; ENFANT = enfant mixte (fille et garçon)
export const audienceEnum = pgEnum("audience", [
  "HOMME",
  "FEMME",
  "UNISEXE",
  "FILLE",
  "GARCON",
  "ENFANT",
]);
export type Audience = (typeof audienceEnum.enumValues)[number];

export const orderStatusEnum = pgEnum("order_status", [
  "EN_ATTENTE", // commande créée, paiement pas encore confirmé
  "PAYEE", // paiement confirmé
  "EN_PREPARATION", // panier en cours de composition
  "EXPEDIEE", // en livraison
  "LIVREE", // livrée
  "ANNULEE", // annulée
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "EN_ATTENTE",
  "REUSSI",
  "ECHOUE",
  "REMBOURSE",
]);

// ─── Catégories ─────────────────────────────────────────

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Produits ───────────────────────────────────────────

export const products = pgTable("products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  // Prix en FCFA, entier (pas de centimes au Cameroun)
  price: integer("price").notNull(),
  stock: integer("stock").notNull().default(0),
  audience: audienceEnum("audience").notNull().default("UNISEXE"),
  // Un nouveau produit naît hors boutique (brouillon) : l'admin le
  // prévisualise puis le publie
  isActive: boolean("is_active").notNull().default(false),
  // 1re mise en boutique (null = brouillon jamais publié ; sinon « masqué »)
  publishedAt: timestamp("published_at"),
  isFeatured: boolean("is_featured").notNull().default(false),
  // Nombre de consultations de la fiche (section « Fréquemment consultés »)
  viewCount: integer("view_count").notNull().default(0),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Médias d'un produit (photos et courtes vidéos), dans l'ordre du carrousel.
// La 1re photo (position 0) sert de vignette partout sur le site.
export const productImages = pgTable("product_images", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  url: text("url").notNull(),
  kind: text("kind", { enum: ["image", "video"] })
    .notNull()
    .default("image"),
  // Vidéo : image affichée avant la lecture
  poster: text("poster"),
  alt: text("alt"),
  position: integer("position").notNull().default(0),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
});

// Photos envoyées depuis l'admin, stockées en base (déjà redimensionnées
// par le navigateur) et servies par /media/<id>
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const mediaFiles = pgTable("media_files", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  mime: text("mime").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Clients ────────────────────────────────────────────
// Compte obligatoire pour commander : l'email reçoit la confirmation de
// paiement, la facture et le récapitulatif de commande.

export const customers = pgTable("customers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(), // toujours en minuscules
  phone: text("phone").notNull(), // WhatsApp / Mobile Money
  // Photo de profil (/media/<id>, carré 400 × 400)
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash").notNull(),
  // Rempli quand l'email sera confirmé (envoi d'emails à venir)
  emailVerifiedAt: timestamp("email_verified_at"),
  // Dernier envoi du lien de confirmation (limite les renvois)
  verificationSentAt: timestamp("verification_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Carnet d'adresses de livraison du client (une adresse par défaut,
// présélectionnée à la commande)
export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Domicile"), // Domicile, Bureau…
    fullName: text("full_name").notNull(), // destinataire
    phone: text("phone").notNull(), // joignable par le livreur
    city: text("city").notNull(),
    address: text("address").notNull(), // quartier, rue
    landmark: text("landmark"), // point de repère
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("customer_addresses_customer_idx").on(t.customerId)]
);

// ─── Historique de consultation ─────────────────────────
// Visiteur anonyme identifié par un cookie (pas de compte client) : sert aux
// recommandations personnalisées et à « Fréquemment consultés ».

export const productViews = pgTable(
  "product_views",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    visitorId: text("visitor_id").notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("product_views_visitor_idx").on(t.visitorId),
    index("product_views_product_idx").on(t.productId),
  ],
);

// ─── Avis clients ───────────────────────────────────────

export const reviews = pgTable(
  "reviews",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Auteur (compte obligatoire pour publier) ; null pour les anciens avis
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull(),
    rating: integer("rating").notNull(), // 1 à 5
    title: text("title").notNull().default(""),
    comment: text("comment").notNull(),
    // Vrai si l'auteur a une commande payée/expédiée/livrée de ce produit
    isVerified: boolean("is_verified").notNull().default(false),
    helpfulCount: integer("helpful_count").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    // Publié directement ; l'admin pourra masquer un avis
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  // Un seul avis par client et par produit (comme sur Amazon)
  (t) => [
    uniqueIndex("reviews_customer_product_idx").on(t.customerId, t.productId),
  ],
);

// ─── Commandes ──────────────────────────────────────────

export const orders = pgTable("orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  // Référence lisible affichée au client (ex: EID-2026-0001)
  reference: text("reference").notNull().unique(),

  // Coordonnées client (pas de compte requis pour acheter)
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(), // WhatsApp / MoMo
  customerEmail: text("customer_email"),

  // Livraison
  deliveryCity: text("delivery_city").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryNote: text("delivery_note"),

  // Montants en FCFA
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  total: integer("total").notNull(),

  status: orderStatusEnum("status").notNull().default("EN_ATTENTE"),
  payment: paymentStatusEnum("payment").notNull().default("EN_ATTENTE"),

  // Référence paiement côté agrégateur (Fapshi transId, etc.)
  paymentRef: text("payment_ref"),
  paymentMethod: text("payment_method"), // MTN_MOMO, ORANGE_MONEY...

  // True une fois la commande transmise sur WhatsApp
  whatsappSent: boolean("whatsapp_sent").notNull().default(false),

  // Cookie visiteur au moment de la commande (recommandations personnalisées)
  visitorId: text("visitor_id"),
  // Emails envoyés au client (une seule fois chacun) :
  // - confirmation de réception (mode sans paiement en ligne)
  // - confirmation de paiement + facture
  // Stock retiré pour cette commande (évite un double décompte ; remis en
  // stock si la commande est annulée ou remboursée)
  stockDecrementedAt: timestamp("stock_decremented_at"),
  confirmationEmailSentAt: timestamp("confirmation_email_sent_at"),
  invoiceEmailSentAt: timestamp("invoice_email_sent_at"),
  // Compte client (null pour les commandes passées avant les comptes)
  customerId: text("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
});

export const orderItems = pgTable("order_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  // Snapshot du nom et prix au moment de la commande
  productName: text("product_name").notNull(),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: integer("line_total").notNull(),
});

// ─── Suivi des commandes et notifications ──────────────

// Étapes datées d'une commande (suivi client, emails, notifications)
export const orderEventEnum = pgEnum("order_event", [
  "CREEE", // commande passée
  "PAYEE", // paiement encaissé
  "EN_PREPARATION",
  "EXPEDIEE",
  "LIVREE",
  "ANNULEE",
]);
export type OrderEventType = (typeof orderEventEnum.enumValues)[number];

export const orderEvents = pgTable(
  "order_events",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: orderEventEnum("type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)]
);

// Notifications in-app : pour l'équipe (audience "ADMIN") ou pour un client
export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    audience: text("audience", { enum: ["ADMIN", "CLIENT"] }).notNull(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"), // page à ouvrir au clic
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("notifications_audience_idx").on(t.audience, t.customerId, t.readAt)]
);

// ─── Admin ──────────────────────────────────────────────

export const adminUsers = pgTable("admin_users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ──────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  reviews: many(reviews),
  orderItems: many(orderItems),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  events: many(orderEvents),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// ─── Types inférés ──────────────────────────────────────

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
