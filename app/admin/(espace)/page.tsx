import Link from "next/link";
import { connection } from "next/server";
import { and, avg, count, desc, eq, gt, gte, inArray, lte, ne, sql, sum } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, orderItems, orders, products, reviews } from "@/lib/db/schema";
import { formatPrice } from "@/lib/utils";
import { AdminPage, AdminTable, adminTd } from "@/components/admin/admin-page";
import { BarChart } from "@/components/admin/bar-chart";
import { orderStatusLabel } from "@/lib/order-status";
import { getFinance } from "@/lib/finance";

export const metadata = { title: "Admin", robots: { index: false } };

// L'argent compte quand il est encaissé
const PAID = eq(orders.payment, "REUSSI");
const OPEN = and(ne(orders.payment, "REUSSI"), ne(orders.status, "ANNULEE"));

export default async function AdminHome() {
  await connection();
  await requireAdminPage();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    [sales],
    [monthSales],
    [toCollect],
    [toPrepare],
    [clients],
    [newClients],
    [reviewStats],
    [productStats],
    outOfStock,
    lowStock,
    recent,
    top,
    finance,
  ] = await Promise.all([
    db.select({ n: count(), total: sum(orders.total) }).from(orders).where(PAID),
    db.select({ n: count(), total: sum(orders.total) }).from(orders).where(and(PAID, gte(orders.paidAt, monthStart))),
    db.select({ n: count(), total: sum(orders.total) }).from(orders).where(OPEN),
    db.select({ n: count() }).from(orders).where(and(PAID, inArray(orders.status, ["PAYEE", "EN_PREPARATION"]))),
    db.select({ n: count() }).from(customers),
    db.select({ n: count() }).from(customers).where(gte(customers.createdAt, monthStart)),
    db.select({ n: count(), avg: avg(reviews.rating) }).from(reviews).where(eq(reviews.isPublished, true)),
    db.select({ n: count(), active: sql<number>`count(*) filter (where ${products.isActive})::int` }).from(products),
    db.query.products.findMany({ where: and(eq(products.stock, 0), eq(products.isActive, true)), orderBy: products.name }),
    db.query.products.findMany({
      where: and(gt(products.stock, 0), lte(products.stock, 5), eq(products.isActive, true)),
      orderBy: products.stock,
      limit: 8,
    }),
    db.query.orders.findMany({ orderBy: desc(orders.createdAt), limit: 6 }),
    db
      .select({ name: orderItems.productName, qty: sum(orderItems.quantity), revenue: sum(orderItems.lineTotal) })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(PAID)
      .groupBy(orderItems.productName)
      .orderBy(desc(sum(orderItems.quantity)))
      .limit(5),
    getFinance("7j"),
  ]);

  const revenue = Number(sales.total ?? 0);
  const basket = sales.n ? Math.round(revenue / sales.n) : 0;

  return (
    <AdminPage
      title="Tableau de bord"
      subtitle="Vue d'ensemble de la boutique"
      actions={
        <>
          <Link href="/admin/produits/nouveau" className="btn btn-primary">
            + Ajouter un produit
          </Link>
          <Link href="/admin/commandes?onglet=a-encaisser" className="btn btn-outline">
            À encaisser ({toCollect.n})
          </Link>
        </>
      }
    >
      <div className="kpi-grid">
        <Kpi label="Chiffre d'affaires encaissé" value={formatPrice(revenue)} hint={`${sales.n} commande(s) payée(s)`} accent href="/admin/finances?periode=tout" />
        <Kpi label="Encaissé ce mois-ci" value={formatPrice(Number(monthSales.total ?? 0))} hint={`${monthSales.n} commande(s)`} href="/admin/finances?periode=30j" />
        <Kpi
          label="À encaisser"
          value={formatPrice(Number(toCollect.total ?? 0))}
          hint={`${toCollect.n} commande(s) non payée(s)`}
          warn={toCollect.n > 0}
          href="/admin/commandes?onglet=a-encaisser"
        />
        <Kpi label="À préparer" value={String(toPrepare.n)} hint="Payées, à expédier" href="/admin/commandes?onglet=a-preparer" />
        <Kpi label="Panier moyen" value={formatPrice(basket)} />
        <Kpi label="Clients" value={String(clients.n)} hint={`+${newClients.n} ce mois-ci`} href="/admin/clients" />
        <Kpi
          label="Avis clients"
          value={reviewStats.n ? `${Number(reviewStats.avg).toFixed(1).replace(".", ",")} ★` : "—"}
          hint={`${reviewStats.n} avis publiés`}
          href="/admin/avis"
        />
        <Kpi label="Produits en ligne" value={`${productStats.active} / ${productStats.n}`} href="/admin/produits" />
        <Kpi
          label="En rupture de stock"
          value={String(outOfStock.length)}
          hint={`${lowStock.length} autre(s) en stock faible`}
          danger={outOfStock.length > 0}
          href="/admin/produits?filtre=rupture"
        />
      </div>

      <section className="dash-card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "1.15rem", color: "var(--forest)" }}>Encaissements des 7 derniers jours</h2>
          <span style={{ fontSize: "0.88rem", color: "var(--muted)" }}>
            Total : <strong style={{ color: "var(--ink)" }}>{formatPrice(finance.collected)}</strong> ·{" "}
            <Link href="/admin/finances" className="link-muted">
              Voir les finances →
            </Link>
          </span>
        </div>
        <BarChart data={finance.series} height={150} valueLabel="Montant encaissé par jour" />
      </section>

      <div className="dash-grid">
        <Panel title="🚨 Ruptures de stock" link={{ href: "/admin/produits?filtre=rupture", label: "Réapprovisionner" }}>
          <AdminTable head={["Produit", "Stock"]} empty={outOfStock.length ? undefined : "Aucune rupture de stock 👍"}>
            {outOfStock.map((p) => (
              <tr key={p.id}>
                <td style={adminTd}>
                  <Link href={`/admin/produits/${p.id}`} className="link-muted">
                    {p.name}
                  </Link>
                </td>
                <td style={{ ...adminTd, color: "var(--danger)", fontWeight: 700 }}>0</td>
              </tr>
            ))}
          </AdminTable>
        </Panel>

        <Panel title="⚠ Stock faible" link={{ href: "/admin/produits?filtre=stock-faible", label: "Voir tout" }}>
          <AdminTable head={["Produit", "Stock"]} empty={lowStock.length ? undefined : "Aucun produit en stock faible."}>
            {lowStock.map((p) => (
              <tr key={p.id}>
                <td style={adminTd}>
                  <Link href={`/admin/produits/${p.id}`} className="link-muted">
                    {p.name}
                  </Link>
                </td>
                <td style={{ ...adminTd, color: "var(--earth)", fontWeight: 700 }}>{p.stock}</td>
              </tr>
            ))}
          </AdminTable>
        </Panel>

        <Panel title="Dernières commandes" link={{ href: "/admin/commandes", label: "Toutes les commandes" }}>
          <AdminTable head={["Référence", "Client", "Total", "Paiement", "Statut"]} empty={recent.length ? undefined : "Aucune commande."}>
            {recent.map((o) => (
              <tr key={o.id}>
                <td style={adminTd}>
                  <Link href={`/admin/commandes/${o.id}`} style={{ fontWeight: 600, color: "var(--forest)" }}>
                    {o.reference}
                  </Link>
                </td>
                <td style={adminTd}>{o.customerName}</td>
                <td style={{ ...adminTd, whiteSpace: "nowrap" }}>{formatPrice(o.total)}</td>
                <td style={{ ...adminTd, whiteSpace: "nowrap" }}>
                  {o.payment === "REUSSI" ? (
                    <span style={{ color: "var(--success)" }}>✓ Encaissée</span>
                  ) : o.status === "ANNULEE" ? (
                    "—"
                  ) : (
                    <span style={{ color: "var(--earth)" }}>À encaisser</span>
                  )}
                </td>
                <td style={adminTd}>
                  <StatusChip status={o.status} />
                </td>
              </tr>
            ))}
          </AdminTable>
        </Panel>

        <Panel title="Meilleures ventes">
          <AdminTable head={["Produit", "Vendus", "CA"]} empty={top.length ? undefined : "Pas encore de ventes."}>
            {top.map((t) => (
              <tr key={t.name}>
                <td style={adminTd}>{t.name}</td>
                <td style={adminTd}>{Number(t.qty)}</td>
                <td style={{ ...adminTd, whiteSpace: "nowrap" }}>{formatPrice(Number(t.revenue))}</td>
              </tr>
            ))}
          </AdminTable>
        </Panel>
      </div>

      <style>{`
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .dash-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; }
        @media (max-width: 1100px) { .dash-grid { grid-template-columns: 1fr; } }
        .dash-card { border: 1px solid var(--line); border-radius: 0.9rem; background: #fff; padding: 1.25rem; }
      `}</style>
    </AdminPage>
  );
}

function Kpi({
  label,
  value,
  hint,
  href,
  accent,
  warn,
  danger,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  accent?: boolean;
  warn?: boolean;
  danger?: boolean;
}) {
  const border = danger ? "#e8c4bf" : warn ? "#e8d4a0" : "var(--line)";
  const bg = accent ? "var(--forest)" : danger ? "#fbeae8" : warn ? "#fdf6e3" : "#fff";
  const body = (
    <div
      style={{
        height: "100%",
        border: `1px solid ${border}`,
        borderRadius: "0.9rem",
        padding: "1.1rem 1.25rem",
        background: bg,
        color: accent ? "var(--ivory)" : "var(--ink)",
      }}
    >
      <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: "1.55rem", fontWeight: 700, fontFamily: "var(--font-display)", marginTop: 4 }}>{value}</div>
      {hint && <div style={{ fontSize: "0.78rem", opacity: 0.7, marginTop: 2 }}>{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {body}
    </Link>
  ) : (
    body
  );
}

function Panel({ title, link, children }: { title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
        <h2 style={{ fontSize: "1.2rem", color: "var(--forest)" }}>{title}</h2>
        {link && (
          <Link href={link.href} className="link-muted" style={{ fontSize: "0.85rem" }}>
            {link.label} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function StatusChip({ status }: { status: string }) {
  const s = orderStatusLabel[status as keyof typeof orderStatusLabel] ?? { label: status, color: "var(--muted)" };
  return (
    <span className="chip" style={{ background: "var(--ivory-deep)", color: s.color, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}
