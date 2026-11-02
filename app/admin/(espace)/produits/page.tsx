import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { and, asc, count, desc, eq, gt, ilike, isNotNull, isNull, lte, type SQL } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import { formatPrice } from "@/lib/utils";
import { audienceLabel } from "@/lib/audience";
import { AdminPage, AdminTable, adminTd } from "@/components/admin/admin-page";
import { ProductRowActions } from "./row-actions";
import { StockInput } from "./stock-input";

export const metadata = { title: "Produits (admin)", robots: { index: false } };

const filters: Record<string, { label: string; where?: SQL }> = {
  tous: { label: "Tous" },
  "en-ligne": { label: "En ligne", where: eq(products.isActive, true) },
  brouillons: { label: "Brouillons", where: and(eq(products.isActive, false), isNull(products.publishedAt)) },
  masques: { label: "Masqués", where: and(eq(products.isActive, false), isNotNull(products.publishedAt)) },
  rupture: { label: "En rupture", where: eq(products.stock, 0) },
  "stock-faible": { label: "Stock faible (≤ 5)", where: and(gt(products.stock, 0), lte(products.stock, 5)) },
};

type Status = "online" | "draft" | "hidden";
const productStatus = (p: { isActive: boolean; publishedAt: Date | null }): Status => (p.isActive ? "online" : p.publishedAt ? "hidden" : "draft");
const statusLabel: Record<Status, string> = { online: "En ligne", draft: "Brouillon", hidden: "Masqué" };
const statusStyle: Record<Status, React.CSSProperties> = {
  online: { background: "var(--foliage-soft)", color: "var(--foliage)" },
  draft: { background: "#fdf6e3", color: "var(--brass-deep)" },
  hidden: { background: "#f0e0e0", color: "var(--danger)" },
};

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string }> }) {
  await connection();
  await requireAdminPage();
  const sp = await searchParams;
  const filter = sp.filtre && Object.hasOwn(filters, sp.filtre) ? sp.filtre : "tous";
  const q = sp.q?.trim() ?? "";

  const [rows, counts] = await Promise.all([
    db.query.products.findMany({
      where: and(filters[filter].where, q ? ilike(products.name, `%${q}%`) : undefined),
      with: {
        images: { where: eq(productImages.kind, "image"), orderBy: asc(productImages.position), limit: 1 },
        category: true,
      },
      orderBy: filter === "rupture" || filter === "stock-faible" ? asc(products.stock) : desc(products.createdAt),
    }),
    Promise.all(Object.entries(filters).map(async ([k, f]) => [k, (await db.select({ n: count() }).from(products).where(f.where))[0].n] as const)),
  ]);
  const countOf = Object.fromEntries(counts);

  return (
    <AdminPage
      title="Produits"
      subtitle="Un nouveau produit est enregistré en brouillon : prévisualise-le puis publie-le en boutique."
      actions={
        <Link href="/admin/produits/nouveau" className="btn btn-primary">
          + Ajouter un produit
        </Link>
      }
    >
      <nav aria-label="Filtrer les produits" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {Object.entries(filters).map(([k, f]) => (
          <Link
            key={k}
            href={`/admin/produits?filtre=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-current={k === filter ? "page" : undefined}
            className="chip"
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.85rem",
              textDecoration: "none",
              border: `1px solid ${k === "rupture" && countOf[k] > 0 ? "#e8c4bf" : "var(--line)"}`,
              background: k === filter ? "var(--forest)" : "#fff",
              color: k === filter ? "var(--ivory)" : k === "rupture" && countOf[k] > 0 ? "var(--danger)" : "var(--ink)",
            }}
          >
            {f.label} <strong style={{ marginLeft: 4 }}>{countOf[k]}</strong>
          </Link>
        ))}
      </nav>

      <form method="get" style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem", maxWidth: 480 }}>
        <input type="hidden" name="filtre" value={filter} />
        <input name="q" type="search" defaultValue={q} placeholder="Rechercher un produit…" aria-label="Rechercher un produit" className="field" />
        <button type="submit" className="btn btn-primary">
          Rechercher
        </button>
      </form>

      <AdminTable head={["Produit", "Catégorie", "Public", "Prix", "Stock", "Statut", "Actions"]} empty={rows.length ? undefined : "Aucun produit dans cette liste."}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td style={adminTd}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <div style={{ position: "relative", width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "var(--ivory-deep)", flexShrink: 0 }}>
                  {p.images[0]?.url && <Image src={p.images[0].url} alt="" fill sizes="44px" style={{ objectFit: "cover" }} />}
                </div>
                <span style={{ fontWeight: 500 }}>
                  {p.name}
                  {p.isFeatured && <span title="Mis en avant" style={{ marginLeft: 6 }}>★</span>}
                </span>
              </div>
            </td>
            <td style={adminTd}>{p.category?.name ?? "—"}</td>
            <td style={adminTd}>{audienceLabel[p.audience]}</td>
            <td style={{ ...adminTd, whiteSpace: "nowrap" }}>{formatPrice(p.price)}</td>
            <td style={adminTd}>
              <StockInput id={p.id} stock={p.stock} />
              {p.stock === 0 && <span style={{ display: "block", fontSize: "0.75rem", color: "var(--danger)", marginTop: 3 }}>Rupture</span>}
            </td>
            <td style={adminTd}>
              <span className="chip" style={statusStyle[productStatus(p)]}>
                {statusLabel[productStatus(p)]}
              </span>
            </td>
            <td style={adminTd}>
              <ProductRowActions id={p.id} isActive={p.isActive} published={!!p.publishedAt} name={p.name} slug={p.slug} />
            </td>
          </tr>
        ))}
      </AdminTable>
    </AdminPage>
  );
}
