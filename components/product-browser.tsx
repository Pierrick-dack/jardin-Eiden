import Link from "next/link";
import { getCategories, getCategoriesWithCounts, getProducts, type ProductSort } from "@/lib/queries";
import type { Genre } from "@/lib/catalog-visuals";
import { genreAudiences } from "@/lib/audience";
import { ProductCard } from "./product-card";
import { AutoSubmitSelect } from "./auto-submit-select";
import { FiltersPanel } from "./filters-panel";

const sorts: { value: ProductSort; label: string }[] = [
  { value: "populaires", label: "Les plus populaires" },
  { value: "nouveautes", label: "Nouveautés" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
];

export type BrowserFilters = {
  genre?: Genre;
  q?: string;
  sort?: ProductSort;
  categorie?: string;
};

export function parseSort(value?: string): ProductSort | undefined {
  return sorts.some((s) => s.value === value) ? (value as ProductSort) : undefined;
}

/**
 * Liste de produits avec recherche, tri et filtres (public, catégorie) dans un
 * panneau latéral (tiroir sur mobile).
 * Tout passe par l'URL (liens et formulaire GET) : les résultats se partagent
 * par lien et fonctionnent même sans JavaScript.
 * `basePath` = /boutique ou /categorie/<slug> (la catégorie est alors fixée).
 */
export async function ProductBrowser({
  basePath,
  filters,
  fixedCategory,
}: {
  basePath: string;
  filters: BrowserFilters;
  fixedCategory?: string;
}) {
  const categorySlug = fixedCategory ?? filters.categorie;
  const kids = filters.genre === "enfants" || filters.genre === "filles" || filters.genre === "garcons";
  const audiences = filters.genre ? genreAudiences[filters.genre] : undefined;
  const [items, allCats, catCounts] = await Promise.all([
    getProducts({ categorySlug, audiences, q: filters.q, sort: filters.sort }),
    fixedCategory ? Promise.resolve([]) : getCategories(),
    // Nombre de produits par catégorie pour le public choisi
    fixedCategory ? Promise.resolve([]) : getCategoriesWithCounts(audiences),
  ]);
  const countOf = new Map(catCounts.map((c) => [c.slug, c.count]));
  const cats = allCats.filter((c) => countOf.has(c.slug) || c.slug === filters.categorie);

  const href = (patch: Partial<BrowserFilters>) => {
    const next = { ...filters, ...patch };
    const sp = new URLSearchParams();
    if (next.q) sp.set("q", next.q);
    if (next.genre) sp.set("genre", next.genre);
    if (next.categorie && !fixedCategory) sp.set("categorie", next.categorie);
    if (next.sort) sp.set("tri", next.sort);
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const genreLabel: Record<Genre, string> = { femme: "Femme", homme: "Homme", enfants: "Enfants", filles: "Filles", garcons: "Garçons" };
  const active = [
    filters.genre && { label: genreLabel[filters.genre], href: href({ genre: undefined }) },
    filters.categorie && !fixedCategory && { label: allCats.find((c) => c.slug === filters.categorie)?.name ?? filters.categorie, href: href({ categorie: undefined }) },
    filters.q && { label: `« ${filters.q} »`, href: href({ q: undefined }) },
  ].filter((x): x is { label: string; href: string } => !!x);

  const toolbar = (
    <>
      <form action={basePath} method="get" role="search" className="browser-search">
        {filters.genre && <input type="hidden" name="genre" value={filters.genre} />}
        {filters.categorie && !fixedCategory && <input type="hidden" name="categorie" value={filters.categorie} />}
        {filters.sort && <input type="hidden" name="tri" value={filters.sort} />}
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder={fixedCategory ? "Rechercher dans cette catégorie…" : "Rechercher : karité, parfum, baskets…"}
          aria-label="Rechercher un produit"
          className="field"
        />
        <button type="submit" aria-label="Rechercher">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </form>
      <form action={basePath} method="get" className="browser-sort">
        {filters.genre && <input type="hidden" name="genre" value={filters.genre} />}
        {filters.categorie && !fixedCategory && <input type="hidden" name="categorie" value={filters.categorie} />}
        {filters.q && <input type="hidden" name="q" value={filters.q} />}
        <label htmlFor="browser-sort" className="browser-sort-label">
          Trier
        </label>
        <AutoSubmitSelect id="browser-sort" name="tri" defaultValue={filters.sort ?? "populaires"} aria-label="Trier les produits" className="field">
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </AutoSubmitSelect>
      </form>
    </>
  );

  const panel = (
    <div className="fl">
      <FilterGroup title="Pour">
        <FilterLink href={href({ genre: undefined })} on={!filters.genre} label="Tout le monde" />
        <FilterLink href={href({ genre: "femme" })} on={filters.genre === "femme"} label="Femme" />
        <FilterLink href={href({ genre: "homme" })} on={filters.genre === "homme"} label="Homme" />
        <FilterLink href={href({ genre: "enfants" })} on={kids} label="Enfants" />
        {kids && (
          <div className="fl-sub">
            <FilterLink href={href({ genre: "enfants" })} on={filters.genre === "enfants"} label="Tous les enfants" />
            <FilterLink href={href({ genre: "filles" })} on={filters.genre === "filles"} label="Filles" />
            <FilterLink href={href({ genre: "garcons" })} on={filters.genre === "garcons"} label="Garçons" />
          </div>
        )}
      </FilterGroup>
      {cats.length > 0 && (
        <FilterGroup title="Catégorie">
          <FilterLink href={href({ categorie: undefined })} on={!filters.categorie} label="Toutes les catégories" />
          {cats.map((c) => (
            <FilterLink key={c.id} href={href({ categorie: c.slug })} on={filters.categorie === c.slug} label={c.name} count={countOf.get(c.slug) ?? 0} />
          ))}
        </FilterGroup>
      )}
      {active.length > 0 && (
        <Link href={basePath} scroll={false} className="fl-reset">
          Effacer tous les filtres
        </Link>
      )}
    </div>
  );

  const results = (
    <>
      <div className="browser-summary">
        <span>
          <strong>{items.length}</strong> produit{items.length > 1 ? "s" : ""}
        </span>
        {active.map((a) => (
          <Link key={a.label} href={a.href} scroll={false} className="browser-tag" aria-label={`Retirer le filtre ${a.label}`}>
            {a.label} <span aria-hidden>×</span>
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: "3rem 1rem", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "1rem", color: "var(--muted)" }}>
          <p style={{ fontSize: "1.05rem", margin: "0 0 0.75rem" }}>Aucun produit ne correspond à ta recherche.</p>
          <Link href={basePath} className="btn btn-outline">
            Voir tous les produits
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {items.map((p, i) => (
            <ProductCard key={p.id} eager={i < 4} slug={p.slug} name={p.name} price={p.price} stock={p.stock} audience={p.audience} image={p.images[0]?.url} />
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <FiltersPanel count={items.length} activeCount={active.length} toolbar={toolbar} results={results}>
        {panel}
      </FiltersPanel>

      <style>{`
        .browser-search { position: relative; flex: 1 1 260px; min-width: 0; }
        .browser-search .field { padding-right: 3rem; border-radius: 999px; }
        .browser-search button {
          position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 38px; height: 34px; border: none;
          border-radius: 999px; background: var(--forest); color: var(--ivory); display: grid; place-items: center; cursor: pointer;
        }
        .browser-sort { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; }
        .browser-sort-label { font-size: 0.85rem; color: var(--muted); font-weight: 500; margin: 0; }
        .browser-sort .field { width: auto; border-radius: 999px; padding-top: 0.55rem; padding-bottom: 0.55rem; }
        .browser-summary { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem; color: var(--muted); font-size: 0.92rem; }
        .browser-summary strong { color: var(--ink); }
        .browser-tag {
          display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.28rem 0.7rem; border-radius: 999px;
          background: var(--foliage-soft); color: var(--forest); font-size: 0.8rem; font-weight: 600; text-decoration: none;
        }
        .browser-tag:hover { background: #d5e8db; }
        .browser-tag span { font-size: 1rem; line-height: 1; }

        .fl { display: grid; gap: 1.5rem; }
        .fl-group h3 { margin: 0 0 0.5rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); }
        .fl-list { display: grid; gap: 0.15rem; }
        .fl-sub { display: grid; gap: 0.1rem; margin: 0.15rem 0 0.2rem 0.9rem; padding-left: 0.6rem; border-left: 2px solid var(--line); }
        .fl-link {
          display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0.55rem; border-radius: 0.55rem;
          color: var(--ink); text-decoration: none; font-size: 0.92rem;
        }
        .fl-link:hover { background: #fff; color: var(--foliage); }
        .fl-link[aria-current="true"] { background: #fff; color: var(--forest); font-weight: 600; box-shadow: inset 3px 0 0 var(--forest); }
        .fl-radio { width: 16px; height: 16px; border-radius: 999px; border: 2px solid var(--line); flex-shrink: 0; background: #fff; }
        .fl-link[aria-current="true"] .fl-radio { border-color: var(--forest); background: radial-gradient(var(--forest) 0 38%, #fff 43%); }
        .fl-n { margin-left: auto; font-size: 0.78rem; color: var(--muted); font-weight: 500; }
        .fl-reset { font-size: 0.85rem; color: var(--danger); font-weight: 600; }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.75rem 1.25rem;
          padding-bottom: 1rem;
        }
        @media (max-width: 960px) {
          .browser-search { flex-basis: 100%; order: -1; }
          .browser-sort-label { display: none; }
        }
        @media (max-width: 480px) {
          .browser-search .field { font-size: 16px; }
          .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem 0.75rem; }
        }
      `}</style>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="fl-group">
      <h3>{title}</h3>
      <div className="fl-list">{children}</div>
    </section>
  );
}

function FilterLink({ href, label, on, count }: { href: string; label: string; on: boolean; count?: number }) {
  return (
    <Link href={href} scroll={false} className="fl-link" aria-current={on ? "true" : undefined}>
      <span className="fl-radio" aria-hidden />
      {label}
      {count !== undefined && <span className="fl-n">{count}</span>}
    </Link>
  );
}