import Link from "next/link";
import { connection } from "next/server";
import { desc, eq, gt } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { AdminPage } from "@/components/admin/admin-page";
import { ReviewModeration } from "./review-actions";

export const metadata = { title: "Avis (admin)", robots: { index: false } };

const filters = {
  tous: { label: "Tous", where: undefined },
  signales: { label: "Signalés", where: gt(reviews.reportCount, 0) },
  masques: { label: "Masqués", where: eq(reviews.isPublished, false) },
} as const;
type Filter = keyof typeof filters;

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Douala" });

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  await connection();
  await requireAdminPage();
  const raw = (await searchParams).filtre;
  const filter: Filter = raw && Object.hasOwn(filters, raw) ? (raw as Filter) : "tous";

  const rows = await db.query.reviews.findMany({
    where: filters[filter].where,
    with: { product: { columns: { name: true, slug: true } } },
    orderBy: [desc(reviews.reportCount), desc(reviews.createdAt)],
    limit: 200,
  });

  return (
    <AdminPage title="Avis clients" subtitle="Modère les avis : masque ceux qui ne respectent pas les règles.">
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {(Object.keys(filters) as Filter[]).map((f) => (
          <Link
            key={f}
            href={f === "tous" ? "/admin/avis" : `/admin/avis?filtre=${f}`}
            className="chip"
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.85rem",
              textDecoration: "none",
              border: "1px solid var(--line)",
              background: f === filter ? "var(--forest)" : "#fff",
              color: f === filter ? "var(--ivory)" : "var(--ink)",
            }}
          >
            {filters[f].label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", border: "1px solid var(--line)", borderRadius: "0.8rem", background: "#fff" }}>
          Aucun avis dans cette liste.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.85rem" }}>
          {rows.map((r) => (
            <li
              key={r.id}
              style={{
                border: `1px solid ${r.reportCount > 0 && r.isPublished ? "#e8c4bf" : "var(--line)"}`,
                borderRadius: "0.9rem",
                background: r.isPublished ? "#fff" : "#f6f3ec",
                padding: "1rem 1.25rem",
                display: "grid",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", fontSize: "0.88rem" }}>
                <span>
                  <span style={{ color: "var(--brass)" }}>{"★".repeat(r.rating)}</span>
                  <span style={{ color: "var(--line)" }}>{"★".repeat(5 - r.rating)}</span>{" "}
                  <strong>{r.title}</strong> — {r.authorName}
                  {r.isVerified && <span style={{ color: "var(--earth)", marginLeft: 6 }}>✓ Achat vérifié</span>}
                </span>
                <span style={{ color: "var(--muted)" }}>
                  {dateFmt.format(r.createdAt)} ·{" "}
                  {r.product ? (
                    <a href={`/produit/${r.product.slug}#avis`} target="_blank" rel="noreferrer" className="link-muted">
                      {r.product.name}
                    </a>
                  ) : (
                    "produit supprimé"
                  )}
                </span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.55, whiteSpace: "pre-line" }}>{r.comment}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {!r.isPublished && <strong style={{ color: "var(--earth)" }}>Masqué · </strong>}
                  {r.reportCount > 0 && <strong style={{ color: "var(--danger)" }}>⚑ Signalé {r.reportCount} fois · </strong>}
                  {r.helpfulCount} « utile »
                </span>
                <ReviewModeration id={r.id} published={r.isPublished} reported={r.reportCount > 0} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
