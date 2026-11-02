import Link from "next/link";
import { connection } from "next/server";
import { and, count, desc, eq, ilike, inArray, ne, or, type SQL } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatPrice } from "@/lib/utils";
import { orderStatusLabel } from "@/lib/order-status";
import { AdminPage, AdminTable, adminTd } from "@/components/admin/admin-page";

export const metadata = { title: "Commandes (admin)", robots: { index: false } };

// Onglets : chaque file de travail de la boutique
const tabs: Record<string, { label: string; where?: SQL }> = {
  "a-encaisser": { label: "À encaisser", where: and(ne(orders.payment, "REUSSI"), ne(orders.status, "ANNULEE")) },
  "a-preparer": { label: "À préparer", where: and(eq(orders.payment, "REUSSI"), inArray(orders.status, ["PAYEE", "EN_PREPARATION"])) },
  expediees: { label: "Expédiées", where: eq(orders.status, "EXPEDIEE") },
  livrees: { label: "Livrées", where: eq(orders.status, "LIVREE") },
  annulees: { label: "Annulées", where: eq(orders.status, "ANNULEE") },
  toutes: { label: "Toutes" },
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" });

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ onglet?: string; q?: string }> }) {
  await connection();
  await requireAdminPage();
  const sp = await searchParams;
  const tab = sp.onglet && Object.hasOwn(tabs, sp.onglet) ? sp.onglet : "toutes";
  const q = sp.q?.trim() ?? "";
  const search = q
    ? or(ilike(orders.reference, `%${q}%`), ilike(orders.customerName, `%${q}%`), ilike(orders.customerPhone, `%${q.replace(/\D/g, "") || q}%`))
    : undefined;

  const [rows, counts] = await Promise.all([
    db.query.orders.findMany({
      where: and(tabs[tab].where, search),
      with: { items: true },
      orderBy: desc(orders.createdAt),
      limit: 200,
    }),
    Promise.all(
      Object.entries(tabs).map(async ([key, t]) => [key, (await db.select({ n: count() }).from(orders).where(t.where))[0].n] as const)
    ),
  ]);
  const countOf = Object.fromEntries(counts);

  return (
    <AdminPage title="Commandes" subtitle="Encaisse, prépare et suis la livraison des commandes clients.">
      <nav style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }} aria-label="Filtrer les commandes">
        {Object.entries(tabs).map(([key, t]) => (
          <Link
            key={key}
            href={`/admin/commandes?onglet=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-current={key === tab ? "page" : undefined}
            className="chip"
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.85rem",
              textDecoration: "none",
              border: "1px solid var(--line)",
              background: key === tab ? "var(--forest)" : "#fff",
              color: key === tab ? "var(--ivory)" : "var(--ink)",
            }}
          >
            {t.label} <strong style={{ marginLeft: 4 }}>{countOf[key]}</strong>
          </Link>
        ))}
      </nav>

      <form method="get" style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem", maxWidth: 520 }}>
        <input type="hidden" name="onglet" value={tab} />
        <input name="q" type="search" defaultValue={q} placeholder="Référence, client ou téléphone…" aria-label="Rechercher une commande" className="field" />
        <button type="submit" className="btn btn-primary">
          Rechercher
        </button>
      </form>

      <AdminTable
        head={["Commande", "Client", "Articles", "Total", "Paiement", "Livraison", ""]}
        empty={rows.length ? undefined : "Aucune commande dans cette liste."}
      >
        {rows.map((o) => {
          const status = orderStatusLabel[o.status];
          const paid = o.payment === "REUSSI";
          return (
            <tr key={o.id}>
              <td style={adminTd}>
                <Link href={`/admin/commandes/${o.id}`} style={{ fontWeight: 600, color: "var(--forest)" }}>
                  {o.reference}
                </Link>
                <span style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)" }}>{dateFmt.format(o.createdAt)}</span>
              </td>
              <td style={adminTd}>
                {o.customerName}
                <span style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)" }}>
                  +{o.customerPhone} · {o.deliveryCity}
                </span>
              </td>
              <td style={{ ...adminTd, fontSize: "0.85rem" }}>
                {o.items.reduce((n, i) => n + i.quantity, 0)} article(s)
                <span style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", maxWidth: 260 }}>
                  {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                </span>
              </td>
              <td style={{ ...adminTd, fontWeight: 700, whiteSpace: "nowrap" }}>{formatPrice(o.total)}</td>
              <td style={{ ...adminTd, whiteSpace: "nowrap" }}>
                {paid ? (
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>✓ Encaissée</span>
                ) : o.payment === "REMBOURSE" ? (
                  <span style={{ color: "var(--muted)" }}>Remboursée</span>
                ) : o.status === "ANNULEE" ? (
                  <span style={{ color: "var(--muted)" }}>—</span>
                ) : (
                  <span style={{ color: "var(--earth)", fontWeight: 600 }}>À encaisser</span>
                )}
              </td>
              <td style={adminTd}>
                <span className="chip" style={{ background: "var(--ivory-deep)", color: status.color, whiteSpace: "nowrap" }}>
                  {status.label}
                </span>
              </td>
              <td style={adminTd}>
                <Link href={`/admin/commandes/${o.id}`} className="btn btn-outline" style={{ padding: "0.35rem 0.8rem", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                  {!paid && o.status !== "ANNULEE" ? "Encaisser →" : "Voir →"}
                </Link>
              </td>
            </tr>
          );
        })}
      </AdminTable>
      <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>
        Total de la liste : <strong>{formatPrice(rows.reduce((s, o) => s + o.total, 0))}</strong>
      </p>
    </AdminPage>
  );
}
