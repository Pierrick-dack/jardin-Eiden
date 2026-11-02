import { connection } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { countUnread } from "@/lib/notifications";
import { db } from "@/lib/db";
import { orderItems, orders, productImages, products } from "@/lib/db/schema";
import { NotificationBell } from "./notification-bell";
import { AccountMenu, type BuyAgainItem } from "./account-menu";

/** Produits déjà achetés (commandes payées), du plus récent au plus ancien, encore en boutique */
async function getBuyAgain(customerId: string): Promise<BuyAgainItem[]> {
  const rows = await db
    .select({ productId: orderItems.productId })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.customerId, customerId), eq(orders.payment, "REUSSI")))
    .orderBy(desc(orders.createdAt))
    .limit(30);
  const ids = [...new Set(rows.map((r) => r.productId).filter((id): id is string => !!id))];
  const list: BuyAgainItem[] = [];
  for (const id of ids) {
    if (list.length === 3) break;
    const p = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.isActive, true)),
      with: { images: { where: eq(productImages.kind, "image"), orderBy: productImages.position, limit: 1 } },
    });
    if (p) list.push({ productId: p.id, slug: p.slug, name: p.name, price: p.price, stock: p.stock, image: p.images[0]?.url });
  }
  return list;
}

/** En-tête : cloche (si connecté) + menu « Compte et commandes » */
export async function AccountLink() {
  // Lu à chaque requête (session + base) : jamais prérendu, d'où la frontière
  // Suspense autour du composant dans le layout
  await connection();
  const customer = await getCurrentCustomer();
  if (!customer) return <AccountMenu firstName={null} buyAgain={[]} />;
  const [unread, buyAgain] = await Promise.all([
    countUnread({ audience: "CLIENT", customerId: customer.id }),
    getBuyAgain(customer.id).catch(() => []),
  ]);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
      <NotificationBell audience="CLIENT" initialUnread={unread} />
      <AccountMenu firstName={customer.firstName} avatarUrl={customer.avatarUrl} buyAgain={buyAgain} />
    </span>
  );
}

/** Affiché pendant la lecture de la session */
export function AccountLinkFallback() {
  return (
    <span className="am-fallback" aria-hidden style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.5, padding: "0.35rem 0.55rem" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
      <span style={{ fontSize: "0.85rem" }}>Compte</span>
    </span>
  );
}
