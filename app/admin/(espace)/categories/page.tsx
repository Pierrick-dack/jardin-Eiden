import { connection } from "next/server";
import { asc, count, eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { AdminPage, AdminTable } from "@/components/admin/admin-page";
import { CategoryRow, NewCategoryForm } from "./category-forms";

export const metadata = { title: "Catégories (admin)", robots: { index: false } };

export default async function AdminCategoriesPage() {
  await connection();
  await requireAdminPage();

  const rows = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug, n: count(products.id) })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));

  return (
    <AdminPage title="Catégories" subtitle={`${rows.length} catégorie(s) · elles apparaissent en affiches sur l'accueil`}>
      <div style={{ marginBottom: "1.25rem", maxWidth: 560 }}>
        <NewCategoryForm />
      </div>
      <AdminTable head={["Nom", "Adresse", "Produits", ""]} empty={rows.length ? undefined : "Aucune catégorie."}>
        {rows.map((c) => (
          <CategoryRow key={c.id} id={c.id} name={c.name} slug={c.slug} count={c.n} />
        ))}
      </AdminTable>
    </AdminPage>
  );
}
