import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatPrice } from "@/lib/utils";
import { orderStatusLabel } from "@/lib/order-status";
import { invoiceNumber, isOrderPaid, paymentLabel } from "@/lib/invoice";
import { AdminPage, AdminTable, adminTd } from "@/components/admin/admin-page";
import { OrderStatusSelect } from "../status-select";
import { CancelOrderButton, RecordPaymentForm } from "./order-actions";

export const metadata = { title: "Commande (admin)", robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Douala" });

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireAdminPage();
  const { id } = await params;
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id), with: { items: true } });
  if (!order) notFound();

  const paid = isOrderPaid(order);
  const cancelled = order.status === "ANNULEE";
  const status = orderStatusLabel[order.status];
  // Écrire au client sur WhatsApp, message pré-rempli avec la référence
  const waLink = `https://wa.me/${order.customerPhone}?text=${encodeURIComponent(
    `Bonjour ${order.customerName.split(" ")[0]}, c'est Le Jardin d'Eïden au sujet de votre commande ${order.reference}.`
  )}`;

  return (
    <AdminPage
      title={`Commande ${order.reference}`}
      subtitle={`Passée le ${dateFmt.format(order.createdAt)}`}
      actions={
        <Link href="/admin/commandes" className="btn btn-outline">
          ← Toutes les commandes
        </Link>
      }
    >
      <div className="order-detail">
        <div style={{ display: "grid", gap: "1.25rem", alignContent: "start" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <span className="chip" style={{ background: "var(--ivory-deep)", color: status.color, fontSize: "0.82rem", padding: "0.4rem 0.8rem" }}>
              {status.label}
            </span>
            <span
              className="chip"
              style={{
                fontSize: "0.82rem",
                padding: "0.4rem 0.8rem",
                background: paid ? "var(--foliage-soft)" : "#fdf6e3",
                color: paid ? "var(--success)" : order.payment === "REMBOURSE" ? "var(--muted)" : "var(--earth)",
              }}
            >
              {paid ? "✓ Encaissée" : order.payment === "REMBOURSE" ? "Remboursée" : cancelled ? "Non payée" : "À encaisser"}
            </span>
          </div>

          <AdminTable head={["Article", "Qté", "Prix unitaire", "Total"]}>
            {order.items.map((it) => (
              <tr key={it.id}>
                <td style={adminTd}>
                  {it.productId ? (
                    <Link href={`/admin/produits/${it.productId}`} className="link-muted">
                      {it.productName}
                    </Link>
                  ) : (
                    it.productName
                  )}
                </td>
                <td style={adminTd}>{it.quantity}</td>
                <td style={{ ...adminTd, whiteSpace: "nowrap" }}>{formatPrice(it.unitPrice)}</td>
                <td style={{ ...adminTd, whiteSpace: "nowrap", fontWeight: 600 }}>{formatPrice(it.lineTotal)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...adminTd, textAlign: "right" }} colSpan={3}>
                Sous-total
              </td>
              <td style={adminTd}>{formatPrice(order.subtotal)}</td>
            </tr>
            <tr>
              <td style={{ ...adminTd, textAlign: "right" }} colSpan={3}>
                Livraison
              </td>
              <td style={adminTd}>{order.deliveryFee ? formatPrice(order.deliveryFee) : "—"}</td>
            </tr>
            <tr>
              <td style={{ ...adminTd, textAlign: "right", fontWeight: 700 }} colSpan={3}>
                Total
              </td>
              <td style={{ ...adminTd, fontWeight: 700, color: "var(--forest)", whiteSpace: "nowrap" }}>{formatPrice(order.total)}</td>
            </tr>
          </AdminTable>

          <div className="detail-cards">
            <Card title="Client">
              <strong>{order.customerName}</strong>
              <br />
              <a href={`tel:+${order.customerPhone}`} className="link-muted">
                +{order.customerPhone}
              </a>
              {order.customerEmail && (
                <>
                  <br />
                  <a href={`mailto:${order.customerEmail}`} className="link-muted">
                    {order.customerEmail}
                  </a>
                </>
              )}
            </Card>
            <Card title="Livraison">
              {order.deliveryAddress}
              <br />
              <strong>{order.deliveryCity}</strong>
              {order.deliveryNote && (
                <>
                  <br />
                  <span style={{ color: "var(--muted)" }}>Note : {order.deliveryNote}</span>
                </>
              )}
            </Card>
            <Card title="Paiement">
              {paid ? (
                <>
                  {paymentLabel(order)}
                  <br />
                  {order.paidAt && <>Le {dateFmt.format(order.paidAt)}</>}
                  {order.paymentRef && (
                    <>
                      <br />
                      <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Réf. {order.paymentRef}</span>
                    </>
                  )}
                </>
              ) : (
                <span style={{ color: "var(--muted)" }}>{order.payment === "REMBOURSE" ? "Remboursée" : "Pas encore encaissée"}</span>
              )}
            </Card>
          </div>
        </div>

        <aside style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          {!paid && !cancelled && (
            <Panel title="💰 Encaisser la commande">
              <RecordPaymentForm id={order.id} total={formatPrice(order.total)} />
            </Panel>
          )}

          {!cancelled && (
            <Panel title="🚚 Livraison">
              <OrderStatusSelect id={order.id} current={order.status} />
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ background: "#25D366", color: "#fff", marginTop: "0.75rem", width: "100%" }}
              >
                💬 Écrire au client sur WhatsApp
              </a>
            </Panel>
          )}

          {paid && (
            <Panel title="🧾 Facture">
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem" }}>
                {invoiceNumber(order)}
                <br />
                <span style={{ color: "var(--muted)" }}>
                  {order.invoiceEmailSentAt ? `Envoyée au client le ${dateFmt.format(order.invoiceEmailSentAt)}` : "Pas encore envoyée par email"}
                </span>
              </p>
              <a href={`/admin/commandes/${order.id}/facture`} className="btn btn-primary" style={{ display: "block", textAlign: "center" }}>
                ⬇ Télécharger la facture
              </a>
            </Panel>
          )}

          {!cancelled && (
            <Panel title="Annulation">
              <CancelOrderButton id={order.id} paid={paid} />
            </Panel>
          )}
        </aside>
      </div>

      <style>{`
        .order-detail { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1.5rem; align-items: start; }
        @media (max-width: 1100px) { .order-detail { grid-template-columns: 1fr; } }
        .detail-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
      `}</style>
    </AdminPage>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "0.9rem", background: "#fff", padding: "1rem 1.15rem", fontSize: "0.9rem", lineHeight: 1.55 }}>
      <p style={{ margin: "0 0 0.4rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--foliage)", fontWeight: 700 }}>{title}</p>
      {children}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid var(--line)", borderRadius: "0.9rem", background: "#fff", padding: "1.15rem" }}>
      <h2 style={{ fontSize: "1.05rem", color: "var(--forest)", marginBottom: "0.85rem" }}>{title}</h2>
      {children}
    </section>
  );
}
