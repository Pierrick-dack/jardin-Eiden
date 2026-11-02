"use server";

import { refresh } from "next/cache";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { customerAddresses } from "@/lib/db/schema";
import { getSessionCustomer } from "@/lib/customer-auth";
import { addressSchema } from "@/lib/addresses";
import { normalizeCameroonPhone } from "@/lib/utils";

export type AddressState = { ok?: boolean; id?: string; error?: string };

/** Ajoute (sans id) ou modifie (avec id) une adresse du client connecté */
export async function saveAddressAction(_prev: AddressState, formData: FormData): Promise<AddressState> {
  const customer = await getSessionCustomer();
  if (!customer) return { error: "Ta session a expiré. Reconnecte-toi." };

  const parsed = addressSchema.safeParse({
    label: formData.get("label") || "Domicile",
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    address: formData.get("address"),
    landmark: formData.get("landmark") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Adresse invalide" };
  const data = { ...parsed.data, phone: normalizeCameroonPhone(parsed.data.phone), landmark: parsed.data.landmark ?? null };

  const id = String(formData.get("id") || "");
  const existing = await db.query.customerAddresses.findMany({
    where: eq(customerAddresses.customerId, customer.id),
    columns: { id: true },
  });
  if (id && !existing.some((a) => a.id === id)) return { error: "Adresse introuvable." };
  // La 1re adresse est forcément l'adresse par défaut
  const makeDefault = formData.get("isDefault") === "on" || existing.length === 0;

  let savedId = id;
  if (id) {
    await db
      .update(customerAddresses)
      .set({ ...data, ...(makeDefault && { isDefault: true }), updatedAt: new Date() })
      .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customer.id)));
  } else {
    const [row] = await db
      .insert(customerAddresses)
      .values({ ...data, customerId: customer.id, isDefault: makeDefault })
      .returning({ id: customerAddresses.id });
    savedId = row.id;
  }
  if (makeDefault) await keepOnlyDefault(customer.id, savedId);

  refresh();
  return { ok: true, id: savedId };
}

export async function deleteAddressAction(id: string) {
  const customer = await getSessionCustomer();
  if (!customer) return;
  const [deleted] = await db
    .delete(customerAddresses)
    .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customer.id)))
    .returning({ isDefault: customerAddresses.isDefault });
  // L'adresse par défaut supprimée : la plus récente prend le relais
  if (deleted?.isDefault) {
    const next = await db.query.customerAddresses.findFirst({
      where: eq(customerAddresses.customerId, customer.id),
      orderBy: desc(customerAddresses.updatedAt),
    });
    if (next) await db.update(customerAddresses).set({ isDefault: true }).where(eq(customerAddresses.id, next.id));
  }
  refresh();
}

export async function setDefaultAddressAction(id: string) {
  const customer = await getSessionCustomer();
  if (!customer) return;
  const updated = await db
    .update(customerAddresses)
    .set({ isDefault: true })
    .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customer.id)))
    .returning({ id: customerAddresses.id });
  if (updated.length) await keepOnlyDefault(customer.id, id);
  refresh();
}

async function keepOnlyDefault(customerId: string, defaultId: string) {
  await db
    .update(customerAddresses)
    .set({ isDefault: false })
    .where(and(eq(customerAddresses.customerId, customerId), ne(customerAddresses.id, defaultId)));
}
