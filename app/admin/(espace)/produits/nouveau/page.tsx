import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth";
import { getCategories } from "@/lib/queries";
import { AdminPage } from "@/components/admin/admin-page";
import { ProductForm } from "../product-form";
import { createProduct } from "../actions";

export const metadata = { title: "Nouveau produit", robots: { index: false } };

export default async function NewProductPage() {
  await connection();
  await requireAdminPage();
  const categories = await getCategories();

  return (
    <AdminPage title="Nouveau produit" subtitle="Enregistré en brouillon : tu le prévisualises avant de le mettre en boutique.">
      <ProductForm action={createProduct} categories={categories} submitLabel="Enregistrer et prévisualiser" />
    </AdminPage>
  );
}
