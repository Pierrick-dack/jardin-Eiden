import { connection } from "next/server";
import { and, count, desc, eq, ilike, notInArray, or, sql, sum } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, orders } from "@/lib/db/schema";
import { formatPrice } from "@/lib/utils";
import { AdminPage, AdminTable, adminTd } from "@/components/admin/admin-page";

export const metadata = { title: "Clients (admin)", robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Douala" });

export default async function AdminClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  await requireAdminPage();
  const q = (await searchParams).q?.trim() ?? "";
  const like = `%${q}%`;

  const rows = await db
    .select({
      id: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
      email: customers.email,
      phone: customers.phone,
      verified: customers.emailVerifiedAt,
      createdAt: customers.createdAt,
      orders: count(orders.id),
      // Montant réellement encaissé
      spent: sum(sql`case when ${orders.payment} = 'REUSSI' then ${orders.total} else 0 end`),
    })
    .from(customers)
    .leftJoin(orders, and(eq(orders.customerId, customers.id), notInArray(orders.status, ["ANNULEE"])))
    .where(
      q
        ? or(ilike(customers.firstName, like), ilike(customers.lastName, like), ilike(customers.email, like), ilike(customers.phone, like))
        : undefined
    )
    .groupBy(customers.id)
    .orderBy(desc(customers.createdAt))
    .limit(200);

  return (
    <AdminPage title="Clients" subtitle={`${rows.length} client(s)${q ? ` pour « ${q} »` : ""}`}>
      <form method="get" style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem", maxWidth: 520 }}>
        <input name="q" defaultValue={q} placeholder="Nom, email ou téléphone…" aria-label="Rechercher un client" className="field" type="search" />
        <button type="submit" className="btn btn-primary">
          Rechercher
        </button>
      </form>
      <AdminTable
        head={["Client", "Email", "Téléphone", "Commandes", "Total dépensé", "Inscrit le", "Email confirmé"]}
        empty={rows.length ? undefined : "Aucun client."}
      >
        {rows.map((c) => (
          <tr key={c.id}>
            <td style={{ ...adminTd, fontWeight: 500 }}>
              {c.firstName} {c.lastName}
            </td>
            <td style={adminTd}>
              <a href={`mailto:${c.email}`} className="link-muted">
                {c.email}
              </a>
            </td>
            <td style={adminTd}>
              <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noreferrer" className="link-muted">
                +{c.phone}
              </a>
            </td>
            <td style={adminTd}>{c.orders}</td>
            <td style={adminTd}>{formatPrice(Number(c.spent ?? 0))}</td>
            <td style={adminTd}>{dateFmt.format(c.createdAt)}</td>
            <td style={adminTd}>
              {c.verified ? (
                <span style={{ color: "var(--success)" }}>✓ Oui</span>
              ) : (
                <span style={{ color: "var(--earth)" }}>En attente</span>
              )}
            </td>
          </tr>
        ))}
      </AdminTable>
    </AdminPage>
  );
}
