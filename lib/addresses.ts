// Carnet d'adresses de livraison des clients
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { customerAddresses } from "./db/schema";

export const addressSchema = z.object({
  label: z.string().trim().max(40).default("Domicile"),
  fullName: z.string().trim().min(2, "Nom du destinataire requis").max(120),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 9, "Numéro de téléphone invalide"),
  city: z.string().trim().min(2, "Ville requise").max(80),
  address: z.string().trim().min(3, "Quartier / adresse requis").max(300),
  landmark: z.string().trim().max(300).optional(),
});

/** Adresses d'un client, l'adresse par défaut en premier */
export function getAddresses(customerId: string) {
  return db.query.customerAddresses.findMany({
    where: eq(customerAddresses.customerId, customerId),
    orderBy: [desc(customerAddresses.isDefault), asc(customerAddresses.createdAt)],
  });
}

/** Version sérialisable pour les composants client */
export type AddressView = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  city: string;
  address: string;
  landmark: string | null;
  isDefault: boolean;
};

export const toAddressView = (a: AddressView): AddressView => ({
  id: a.id,
  label: a.label,
  fullName: a.fullName,
  phone: a.phone,
  city: a.city,
  address: a.address,
  landmark: a.landmark,
  isDefault: a.isDefault,
});
