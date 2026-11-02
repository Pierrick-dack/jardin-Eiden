import Link from "next/link";
import { connection } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatPrice } from "@/lib/utils";
import { invoiceNumber, paymentLabel } from "@/lib/invoice";
import { AdminPage, AdminTable, adminTd } from "@/components/admin/admin-page";

export const metadata = { title: "Factures (admin)", robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Douala" });

export default async function AdminInvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  await requireAdminPage();
  const q = (await searchParams).q?.trim() ?? "";
  const like = `%${q.replace(/^FAC-/i, "")}%`;

  // Une facture = une commande encaissée
  const rows = await db.query.orders.findMany({
    where: and(
      eq(orders.payment, "REUSSI"),
      q ? or(ilike(orders.reference, like), ilike(orders.customerName, like), ilike(orders.customerEmail, like)) : undefined
    ),
    orderBy: desc(orders.paidAt),
    limit: 200,
  });
  const total = rows.reduce((s, o) => s + o.total, 0);

  return (
    <AdminPage title="Factures" subtitle={`${rows.length} facture(s) · ${formatPrice(total)}`}>
      <form method="get" style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem", maxWidth: 520 }}>
        <input name="q" type="search" defaultValue={q} placeholder="N° de facture, commande, client ou email…" aria-label="Rechercher une facture" className="field" />
        <button type="submit" className="btn btn-primary">
          Rechercher
        </button>
      </form>
      <AdminTable head={["N° facture", "Date", "Client", "Moyen", "Montant", "Envoi email", "Actions"]} empty={rows.length ? undefined : "Aucune facture."}>
        {rows.map((o) => (
          <tr key={o.id}>
            <td style={adminTd}>
              <strong>{invoiceNumber(o)}</strong>
              <Link href={`/admin/commandes/${o.id}`} className="link-muted" style={{ display: "block", fontSize: "0.78rem" }}>
                Commande {o.reference}
              </Link>
            </td>
            <td style={adminTd}>{o.paidAt ? dateFmt.format(o.paidAt) : "—"}</td>
            <td style={adminTd}>
              {o.customerName}
              <span style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)" }}>{o.customerEmail ?? "—"}</span>
            </td>
            <td style={adminTd}>{paymentLabel(o)}</td>
            <td style={{ ...adminTd, fontWeight: 700, whiteSpace: "nowrap" }}>{formatPrice(o.total)}</td>
            <td style={{ ...adminTd, fontSize: "0.82rem" }}>
              {o.invoiceEmailSentAt ? (
                <span style={{ color: "var(--success)" }}>✓ {dateFmt.format(o.invoiceEmailSentAt)}</span>
              ) : (
                <span style={{ color: "var(--earth)" }}>Non envoyée</span>
              )}
            </td>
            <td style={adminTd}>
              <a href={`/admin/commandes/${o.id}/facture`} className="btn btn-primary" style={{ padding: "0.35rem 0.8rem", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                ⬇ PDF
              </a>
            </td>
          </tr>
        ))}
      </AdminTable>
    </AdminPage>
  );
}
