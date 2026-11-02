"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminNavItem = { href: string; label: string; icon: string; badge?: number };

/** Menu latéral de l'admin (lien actif mis en évidence) */
export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu administration" className="admin-nav">
      {items.map((it) => {
        const active = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className="admin-nav-link">
            <span aria-hidden style={{ width: 22, textAlign: "center" }}>
              {it.icon}
            </span>
            <span style={{ flex: 1 }}>{it.label}</span>
            {!!it.badge && <span className="admin-badge">{it.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
