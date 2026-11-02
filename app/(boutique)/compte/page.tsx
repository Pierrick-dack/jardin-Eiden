import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { connection } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireCustomerPage } from "@/lib/customer-auth";
import { formatPrice } from "@/lib/utils";
import { orderStatusLabel } from "@/lib/order-status";
import { invoiceFileName, isOrderPaid } from "@/lib/invoice";
import { getAddresses, toAddressView } from "@/lib/addresses";
import { AddressBook } from "@/components/address-book";
import { TrackOrderButton } from "@/components/order-tracker";
import { buildTracking } from "@/lib/order-tracking";
import { logoutAction } from "@/app/(boutique)/connexion/actions";
import { ResendVerification } from "@/components/resend-verification";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };


const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Douala" });

type SearchParams = Promise<{ suivi?: string }>;

export default function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="wrap" style={{ paddingTop: "2rem", paddingBottom: "3.5rem" }}>
      <Suspense fallback={<p style={{ color: "var(--muted)" }}>Chargement de ton compte…</p>}>
        <Account searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Account({ searchParams }: { searchParams: SearchParams }) {
  const customer = await requireCustomerPage("/compte");
  // ?suivi=<commande> (lien de notification / email) : ouvre son suivi
  const { suivi } = await searchParams;
  // Commandes lues à la requête, jamais pendant le prérendu
  await connection();
  const [myOrders, addresses] = await Promise.all([
    db.query.orders.findMany({
      where: eq(orders.customerId, customer.id),
      with: { items: true, events: true },
      orderBy: desc(orders.createdAt),
    }),
    getAddresses(customer.id),
  ]);

  return (
    <>
    {!customer.emailVerifiedAt && (
      <div
        role="status"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
          borderRadius: "0.9rem",
          background: "#fdf6e3",
          border: "1px solid #e8d4a0",
        }}
      >
        <span>
          📬 <strong>Confirme ton adresse email</strong> pour pouvoir passer commande : clique sur le lien envoyé à{" "}
          {customer.email}.
        </span>
        <ResendVerification next="/compte" />
      </div>
    )}
    <div className="account-grid">
      <aside className="account-card">
        <span className="avatar-lg" aria-hidden>
          {customer.avatarUrl ? (
            <Image src={customer.avatarUrl} alt="" width={60} height={60} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            customer.firstName.charAt(0).toUpperCase()
          )}
        </span>
        <h1 style={{ fontSize: "1.6rem", color: "var(--forest)", marginTop: "0.75rem" }}>
          Bonjour {customer.firstName} !
        </h1>
        <dl style={{ margin: "1.25rem 0", display: "grid", gap: "0.75rem", fontSize: "0.92rem" }}>
          <Info label="Nom" value={`${customer.firstName} ${customer.lastName}`} />
          <Info label="Email" value={customer.email} />
          <Info label="Téléphone / WhatsApp" value={`+${customer.phone}`} />
          <Info label="Client depuis" value={dateFmt.format(customer.createdAt)} />
        </dl>
        <Link href="/compte/profil" className="btn btn-primary" style={{ width: "100%", marginBottom: "0.6rem" }}>
          ✎ Modifier mes informations
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-outline" style={{ width: "100%" }}>
            Se déconnecter
          </button>
        </form>
      </aside>

      <section aria-labelledby="orders-title">
        <h2 id="orders-title" style={{ fontSize: "1.6rem", color: "var(--forest)", marginBottom: "1.25rem" }}>
          Mes commandes
        </h2>
        {myOrders.length === 0 ? (
          <div className="account-card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
            <p style={{ margin: "0 0 1rem", color: "var(--muted)" }}>Tu n&apos;as pas encore passé de commande.</p>
            <Link href="/boutique" className="btn btn-primary">
              Découvrir la boutique
            </Link>
          </div>
        ) : (
          <>
            <p style={{ margin: "-0.5rem 0 1rem", color: "var(--muted)", fontSize: "0.9rem" }}>
              {myOrders.length} commande{myOrders.length > 1 ? "s" : ""} · total dépensé{" "}
              <strong style={{ color: "var(--ink)" }}>
                {formatPrice(myOrders.filter(isOrderPaid).reduce((s, o) => s + o.total, 0))}
              </strong>
            </p>
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Commande</th>
                    <th>Articles</th>
                    <th>Livraison</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                    <th>Paiement</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myOrders.map((o) => {
                    const status = orderStatusLabel[o.status];
                    const paid = isOrderPaid(o);
                    const units = o.items.reduce((s, it) => s + it.quantity, 0);
                    return (
                      <tr key={o.id}>
                        <td data-label="Commande" className="cell-head">
                          <strong style={{ whiteSpace: "nowrap" }}>{o.reference}</strong>
                          <span className="cell-sub">{dateFmt.format(o.createdAt)}</span>
                        </td>
                        <td data-label="Articles" className="cell-items">
                          <details>
                            <summary>
                              {units} article{units > 1 ? "s" : ""}
                            </summary>
                            <table className="items-table">
                              <tbody>
                                {o.items.map((it) => (
                                  <tr key={it.id}>
                                    <td>
                                      {it.productName}
                                      <span className="cell-sub">
                                        {it.quantity} × {formatPrice(it.unitPrice)}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{formatPrice(it.lineTotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </details>
                        </td>
                        <td data-label="Livraison" className="cell-wide">
                          {o.deliveryCity}
                          <span className="cell-sub">{o.deliveryAddress}</span>
                        </td>
                        <td data-label="Total" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <strong>{formatPrice(o.total)}</strong>
                        </td>
                        <td data-label="Paiement" style={{ whiteSpace: "nowrap" }}>
                          {paid ? (
                            <>
                              <span style={{ color: "var(--success)", fontWeight: 600 }}>✓ Payée</span>
                              {o.paidAt && <span className="cell-sub">le {dateFmt.format(o.paidAt)}</span>}
                            </>
                          ) : o.status === "ANNULEE" ? (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          ) : (
                            <span style={{ color: "var(--earth)" }}>En attente</span>
                          )}
                        </td>
                        <td data-label="Statut">
                          <span className="chip" style={{ background: "var(--ivory-deep)", color: status.color, whiteSpace: "nowrap" }}>
                            {status.label}
                          </span>
                        </td>
                        <td data-label="Actions" className="cell-actions">
                          <div style={{ display: "grid", gap: "0.35rem", justifyItems: "start" }}>
                            <TrackOrderButton tracking={buildTracking(o)} autoOpen={suivi === o.id} />
                            {paid ? (
                              <a
                                href={`/compte/commandes/${o.id}/facture`}
                                download={invoiceFileName(o)}
                                className="invoice-btn"
                              >
                                ⬇ Facture PDF
                              </a>
                            ) : (
                              <span className="cell-sub" style={{ margin: 0 }}>
                                Facture après paiement
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2 id="addresses-title" style={{ fontSize: "1.6rem", color: "var(--forest)", margin: "2.5rem 0 0.4rem" }}>
          Mes adresses de livraison
        </h2>
        <p style={{ margin: "0 0 1rem", color: "var(--muted)", fontSize: "0.9rem" }}>
          L&apos;adresse par défaut est proposée automatiquement à chaque commande.
        </p>
        <AddressBook
          addresses={addresses.map(toAddressView)}
          defaults={{ fullName: `${customer.firstName} ${customer.lastName}`, phone: customer.phone }}
          mode="manage"
        />
      </section>

      <style>{`
        .account-grid {
          display: grid;
          grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
          gap: 2.5rem;
          align-items: start;
        }
        @media (max-width: 1100px) { .account-grid { grid-template-columns: 1fr; gap: 1.75rem; } }
        .account-card {
          border: 1px solid var(--line);
          border-radius: 1rem;
          background: #fff;
          padding: 1.5rem;
        }
        .avatar-lg {
          width: 60px; height: 60px; border-radius: 9999px; overflow: hidden;
          display: grid; place-items: center;
          background: var(--foliage-soft); color: var(--foliage);
          font-size: 1.5rem; font-weight: 600;
        }
        .orders-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--line);
          border-radius: 1rem;
          background: #fff;
        }
        .orders-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .orders-table > thead th {
          text-align: left; padding: 0.75rem 1rem; background: var(--ivory-deep);
          font-weight: 600; white-space: nowrap; font-size: 0.82rem;
        }
        .orders-table > tbody > tr > td { padding: 0.85rem 1rem; border-top: 1px solid var(--line); vertical-align: top; }
        .cell-sub { display: block; margin-top: 0.15rem; font-size: 0.8rem; color: var(--muted); }
        .orders-table summary { cursor: pointer; color: var(--foliage); font-weight: 500; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.85rem; }
        .items-table td { padding: 0.35rem 0; border-top: 1px dashed var(--line); vertical-align: top; }
        .invoice-btn {
          display: inline-block; white-space: nowrap;
          padding: 0.35rem 0.75rem; border-radius: 999px;
          background: var(--forest); color: var(--ivory);
          font-size: 0.8rem; font-weight: 600; text-decoration: none;
        }
        .invoice-btn:hover { background: var(--foliage); }
        .cell-items { min-width: 220px; }
        .cell-wide { min-width: 160px; }
        /* Smartphone : chaque commande devient une carte lisible */
        @media (max-width: 720px) {
          .orders-table-wrap { border: none; background: none; overflow: visible; }
          .orders-table, .orders-table > tbody { display: block; }
          .orders-table > thead { display: none; }
          .orders-table > tbody > tr {
            display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem 1rem; margin-bottom: 0.9rem;
            padding: 1rem; border: 1px solid var(--line); border-radius: 1rem; background: #fff;
          }
          .orders-table > tbody > tr > td { display: block; padding: 0; border: none; min-width: 0; text-align: left !important; }
          .orders-table > tbody > tr > td::before {
            content: attr(data-label); display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.05em; color: var(--muted); margin-bottom: 0.2rem;
          }
          .orders-table > tbody > tr > td.cell-head, .orders-table > tbody > tr > td.cell-items,
          .orders-table > tbody > tr > td.cell-wide, .orders-table > tbody > tr > td.cell-actions { grid-column: 1 / -1; }
          .orders-table > tbody > tr > td.cell-head { padding-bottom: 0.6rem; border-bottom: 1px solid var(--line); }
          .orders-table > tbody > tr > td.cell-actions > div { grid-auto-flow: column; justify-content: start; align-items: center; gap: 0.6rem; }
        }
      `}</style>
    </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{label}</dt>
      <dd style={{ margin: "0.15rem 0 0", wordBreak: "break-word" }}>{value}</dd>
    </div>
  );
}
