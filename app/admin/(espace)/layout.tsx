import type { ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { count, gt, inArray, and, eq, ne, or } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, products, reviews } from "@/lib/db/schema";
import { BrandMark } from "@/components/brand-mark";
import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import { NotificationBell } from "@/components/notification-bell";
import { countUnread } from "@/lib/notifications";

// Le menu (session + pastilles) est lu à la requête : il peut bloquer la
// navigation ; les pages, elles, s'affichent derrière loading.tsx.
export const instant = false;

// Espace d'administration (hors page de connexion) : menu propre à l'admin,
// distinct de la boutique. Chaque page et action revérifie aussi la session.
export default async function AdminSpaceLayout({ children }: { children: ReactNode }) {
  await connection();
  const admin = await requireAdminPage();

  // Pastilles du menu : commandes à traiter (à encaisser ou à préparer),
  // produits en rupture, avis signalés
  const [[toHandle], [outOfStock], [reported], unreadNotifs] = await Promise.all([
    db
      .select({ n: count() })
      .from(orders)
      .where(
        or(
          and(ne(orders.payment, "REUSSI"), ne(orders.status, "ANNULEE")),
          and(eq(orders.payment, "REUSSI"), inArray(orders.status, ["PAYEE", "EN_PREPARATION"]))
        )
      ),
    db.select({ n: count() }).from(products).where(and(eq(products.stock, 0), eq(products.isActive, true))),
    db.select({ n: count() }).from(reviews).where(and(gt(reviews.reportCount, 0), eq(reviews.isPublished, true))),
    countUnread({ audience: "ADMIN" }),
  ]);

  const items: AdminNavItem[] = [
    { href: "/admin", label: "Tableau de bord", icon: "📊" },
    { href: "/admin/commandes", label: "Commandes", icon: "🧾", badge: toHandle.n },
    { href: "/admin/finances", label: "Finances", icon: "💰" },
    { href: "/admin/factures", label: "Factures", icon: "📄" },
    { href: "/admin/produits", label: "Produits", icon: "🧴", badge: outOfStock.n },
    { href: "/admin/categories", label: "Catégories", icon: "🗂️" },
    { href: "/admin/clients", label: "Clients", icon: "👥" },
    { href: "/admin/avis", label: "Avis clients", icon: "⭐", badge: reported.n },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: "0.65rem", color: "inherit", textDecoration: "none", minWidth: 0 }}>
            <BrandMark size={28} />
            <span>
              <strong style={{ display: "block", fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
                Jardin d&apos;Eïden
              </strong>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Administration</span>
            </span>
          </Link>
          <span style={{ marginLeft: "auto" }}>
            <NotificationBell audience="ADMIN" initialUnread={unreadNotifs} variant="dark" />
          </span>
        </div>
        <AdminNav items={items} />
        <div className="admin-sidebar-foot">
          <Link href="/" target="_blank" className="admin-nav-link">
            <span aria-hidden style={{ width: 22, textAlign: "center" }}>↗</span> Voir la boutique
          </Link>
          <div style={{ padding: "0.75rem 0.85rem 0", fontSize: "0.8rem", opacity: 0.75, wordBreak: "break-all" }}>
            {admin.name || admin.email}
          </div>
          <form action="/admin/logout" method="post" style={{ padding: "0.5rem 0.85rem" }}>
            <button type="submit" className="admin-logout">
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      <main className="admin-main">{children}</main>

      <style>{`
        .admin-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); min-height: 100vh; }
        .admin-sidebar {
          background: var(--forest);
          color: var(--ivory);
          display: flex;
          flex-direction: column;
          padding: 1.25rem 0.75rem;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .admin-brand {
          display: flex; align-items: center; gap: 0.65rem;
          color: var(--ivory); text-decoration: none;
          padding: 0 0.6rem 1.25rem;
          border-bottom: 1px solid rgba(251,247,239,0.15);
          margin-bottom: 1rem;
        }
        .admin-nav { display: grid; gap: 0.2rem; }
        .admin-nav-link {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.6rem 0.85rem;
          border-radius: 0.6rem;
          color: rgba(251,247,239,0.85);
          text-decoration: none;
          font-size: 0.93rem;
          white-space: nowrap;
        }
        .admin-nav-link:hover { background: rgba(251,247,239,0.08); color: var(--ivory); }
        .admin-nav-link[aria-current="page"] { background: var(--ivory); color: var(--forest); font-weight: 600; }
        .admin-badge {
          min-width: 22px; height: 22px; padding: 0 6px;
          border-radius: 999px; background: var(--brass); color: var(--forest);
          font-size: 0.75rem; font-weight: 700;
          display: inline-grid; place-items: center;
        }
        .admin-sidebar-foot { margin-top: auto; border-top: 1px solid rgba(251,247,239,0.15); padding-top: 0.75rem; }
        .admin-logout {
          width: 100%; padding: 0.5rem; border-radius: 0.6rem;
          border: 1px solid rgba(251,247,239,0.35); background: transparent; color: var(--ivory);
          cursor: pointer; font: inherit; font-size: 0.85rem;
        }
        .admin-logout:hover { background: rgba(251,247,239,0.1); }
        .admin-main { padding: clamp(1.25rem, 3vw, 2.25rem); min-width: 0; background: var(--ivory); }
        @media (max-width: 900px) {
          .admin-layout { grid-template-columns: 1fr; }
          .admin-sidebar { position: static; height: auto; padding: 0.75rem; }
          .admin-brand { padding-bottom: 0.75rem; margin-bottom: 0.5rem; }
          .admin-nav { grid-auto-flow: column; grid-auto-columns: max-content; overflow-x: auto; padding-bottom: 0.25rem; }
          .admin-sidebar-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
          .admin-sidebar-foot > div { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
