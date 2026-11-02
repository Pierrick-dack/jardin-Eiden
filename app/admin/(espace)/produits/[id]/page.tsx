import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth";
import { getCategories } from "@/lib/queries";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { AdminPage } from "@/components/admin/admin-page";
import { ProductForm } from "../product-form";
import { updateProduct } from "../actions";

export const metadata = { title: "Modifier un produit", robots: { index: false } };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireAdminPage();

  const { id } = await params;
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: { images: { orderBy: asc(productImages.position) } },
  });
  if (!product) notFound();

  const categories = await getCategories();

  // Lie l'id à l'action serveur
  const action = updateProduct.bind(null, id);

  return (
    <AdminPage
      title={`Modifier : ${product.name}`}
      actions={
        <Link href={`/admin/produits/${id}/apercu`} className="btn btn-outline">
          👁 Aperçu
        </Link>
      }
    >
      <ProductForm action={action} categories={categories} product={product} submitLabel="Enregistrer et prévisualiser" />
    </AdminPage>
  );
}
