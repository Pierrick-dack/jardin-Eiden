import Link from "next/link";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth";
import { getFinance, parsePeriod, PERIODS, type Period } from "@/lib/finance";
import { formatPrice } from "@/lib/utils";
import { paymentLabel } from "@/lib/invoice";
import { AdminPage, AdminTable, adminTd } from "@/components/admin/admin-page";
import { BarChart } from "@/components/admin/bar-chart";

export const metadata = { title: "Finances (admin)", robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Douala" });

export default async function AdminFinancesPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  await connection();
  await requireAdminPage();
  const period = parsePeriod((await searchParams).periode);
  const f = await getFinance(period);

  return (
    <AdminPage
      title="Finances"
      subtitle="L'argent encaissé, à encaisser et remboursé sur les commandes."
      actions={
        <a href={`/admin/finances/export?periode=${period}`} className="btn btn-outline">
          ⬇ Exporter les encaissements (CSV)
        </a>
      }
    >
      <nav aria-label="Période" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {(Object.keys(PERIODS) as Period[]).map((p) => (
          <Link
            key={p}
            href={`/admin/finances?periode=${p}`}
            aria-current={p === period ? "page" : undefined}
            className="chip"
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.85rem",
              textDecoration: "none",
              border: "1px solid var(--line)",
              background: p === period ? "var(--forest)" : "#fff",
              color: p === period ? "var(--ivory)" : "var(--ink)",
            }}
          >
            {PERIODS[p].label}
          </Link>
        ))}
      </nav>

      <div className="fin-kpis">
        <Kpi label={`Encaissé (${PERIODS[period].label.toLowerCase()})`} value={formatPrice(f.collected)} hint={`${f.count} commande(s) payée(s)`} accent />
        <Kpi label="À encaisser" value={formatPrice(f.outstanding)} hint={`${f.outstandingCount} commande(s) en attente de paiement`} warn={f.outstandingCount > 0} />
        <Kpi label="Panier moyen" value={formatPrice(f.basket)} />
        <Kpi label="Remboursé" value={formatPrice(f.refunded)} hint={`${f.refundedCount} commande(s)`} />
      </div>

      <div className="fin-grid">
        <section className="fin-card">
          <h2 className="fin-title">Encaissements par {f.byMonth ? "mois" : "jour"}</h2>
          <BarChart data={f.series} valueLabel={`Montant encaissé par ${f.byMonth ? "mois" : "jour"}`} />
        </section>

        <section className="fin-card">
          <h2 className="fin-title">Par moyen de paiement</h2>
          {f.methods.length === 0 ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>Aucun encaissement sur la période.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.85rem" }}>
              {f.methods.map((m) => {
                const share = f.collected ? Math.round((m.total / f.collected) * 100) : 0;
                return (
                  <li key={m.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.88rem" }}>
                      <span>{m.label}</span>
                      <span>
                        <strong>{formatPrice(m.total)}</strong> <span style={{ color: "var(--muted)" }}>· {share} %</span>
                      </span>
                    </div>
                    <div style={{ height: 8, background: "var(--ivory-deep)", borderRadius: 999, marginTop: 6 }} aria-hidden>
                      <div style={{ width: `${share}%`, height: "100%", background: "#2f7d4f", borderRadius: 999 }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <h2 className="fin-title" style={{ marginTop: "2rem" }}>
        À encaisser ({f.outstandingCount})
      </h2>
      <AdminTable head={["Commande", "Date", "Client", "Statut", "Montant", ""]} empty={f.open.length ? undefined : "Rien à encaisser 🎉"}>
        {f.open.slice(0, 50).map((o) => (
          <tr key={o.id}>
            <td style={{ ...adminTd, fontWeight: 600 }}>{o.reference}</td>
            <td style={adminTd}>{dateFmt.format(o.createdAt)}</td>
            <td style={adminTd}>{o.customerName}</td>
            <td style={adminTd}>{o.status === "EN_ATTENTE" ? "Paiement en ligne non finalisé" : "Reçue, non payée"}</td>
            <td style={{ ...adminTd, fontWeight: 700, whiteSpace: "nowrap" }}>{formatPrice(o.total)}</td>
            <td style={adminTd}>
              <Link href={`/admin/commandes/${o.id}`} className="btn btn-primary" style={{ padding: "0.35rem 0.8rem", fontSize: "0.82rem" }}>
                Encaisser
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>

      <h2 className="fin-title" style={{ marginTop: "2rem" }}>
        Encaissements ({f.count})
      </h2>
      <AdminTable head={["Date", "Commande", "Client", "Moyen", "Montant", "Facture"]} empty={f.paid.length ? undefined : "Aucun encaissement sur la période."}>
        {f.paid.slice(0, 100).map((o) => (
          <tr key={o.id}>
            <td style={adminTd}>{o.paidAt ? dateFmt.format(o.paidAt) : "—"}</td>
            <td style={adminTd}>
              <Link href={`/admin/commandes/${o.id}`} className="link-muted">
                {o.reference}
              </Link>
            </td>
            <td style={adminTd}>{o.customerName}</td>
            <td style={adminTd}>{paymentLabel(o)}</td>
            <td style={{ ...adminTd, fontWeight: 700, whiteSpace: "nowrap" }}>{formatPrice(o.total)}</td>
            <td style={adminTd}>
              <a href={`/admin/commandes/${o.id}/facture`} className="link-muted">
                PDF
              </a>
            </td>
          </tr>
        ))}
      </AdminTable>

      <style>{`
        .fin-kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .fin-grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 1.25rem; }
        @media (max-width: 1100px) { .fin-grid { grid-template-columns: 1fr; } }
        .fin-card { border: 1px solid var(--line); border-radius: 0.9rem; background: #fff; padding: 1.25rem; }
        .fin-title { font-size: 1.15rem; color: var(--forest); margin-bottom: 1rem; }
      `}</style>
    </AdminPage>
  );
}

function Kpi({ label, value, hint, accent, warn }: { label: string; value: string; hint?: string; accent?: boolean; warn?: boolean }) {
  return (
    <div
      style={{
        border: `1px solid ${warn ? "#e8d4a0" : "var(--line)"}`,
        borderRadius: "0.9rem",
        padding: "1.1rem 1.25rem",
        background: accent ? "var(--forest)" : warn ? "#fdf6e3" : "#fff",
        color: accent ? "var(--ivory)" : "var(--ink)",
      }}
    >
      <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: "1.55rem", fontWeight: 700, fontFamily: "var(--font-display)", marginTop: 4 }}>{value}</div>
      {hint && <div style={{ fontSize: "0.78rem", opacity: 0.7, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
