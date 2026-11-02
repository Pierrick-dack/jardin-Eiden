"use server";

// Informations personnelles du client : nom, téléphone, photo de profil et
// mot de passe. L'email (identifiant du compte, factures) ne se modifie pas ici.
import { z } from "zod";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { customers, mediaFiles } from "@/lib/db/schema";
import { getSessionCustomer } from "@/lib/customer-auth";
import { normalizeCameroonPhone } from "@/lib/utils";
import { AVATAR_SIZE, mediaIdFromUrl, PHOTO_MAX_BYTES, saveAvatar } from "@/lib/media";

export type ProfileState = { ok?: boolean; error?: string; message?: string };

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "Ton prénom est trop court").max(60),
  lastName: z.string().trim().min(2, "Ton nom est trop court").max(60),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 9, "Numéro de téléphone invalide"),
  avatarUrl: z.string().trim().optional(),
});

/** Supprime l'ancienne photo de profil de la base */
async function dropMedia(url: string | null | undefined) {
  const id = url ? mediaIdFromUrl(url) : null;
  if (id) await db.delete(mediaFiles).where(eq(mediaFiles.id, id));
}

/** Reçoit la photo de profil déjà redimensionnée (400 × 400) par le navigateur */
export async function uploadAvatar(formData: FormData): Promise<{ url: string } | { error: string }> {
  const customer = await getSessionCustomer();
  if (!customer) return { error: "Session expirée : reconnecte-toi." };
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucune photo reçue." };
  if (file.type !== "image/jpeg" || file.size > PHOTO_MAX_BYTES) return { error: "Photo invalide." };
  try {
    return { url: await saveAvatar(Buffer.from(await file.arrayBuffer())) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Envoi impossible." };
  }
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const customer = await getSessionCustomer();
  if (!customer) return { error: "Session expirée : reconnecte-toi." };
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    avatarUrl: formData.get("avatarUrl") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const d = parsed.data;

  // Photo : vide = retirée ; sinon un média envoyé au bon format
  let avatarUrl: string | null = d.avatarUrl || null;
  if (avatarUrl && avatarUrl !== customer.avatarUrl) {
    const id = mediaIdFromUrl(avatarUrl);
    const media = id
      ? await db.query.mediaFiles.findFirst({
          where: and(eq(mediaFiles.id, id), eq(mediaFiles.width, AVATAR_SIZE)),
          columns: { id: true },
        })
      : null;
    if (!media) avatarUrl = customer.avatarUrl ?? null;
  }

  await db
    .update(customers)
    .set({
      firstName: d.firstName,
      lastName: d.lastName,
      phone: normalizeCameroonPhone(d.phone),
      avatarUrl,
    })
    .where(eq(customers.id, customer.id));
  if (customer.avatarUrl && customer.avatarUrl !== avatarUrl) await dropMedia(customer.avatarUrl);

  // En-tête (« Bonjour Prénom », photo) et compte à jour tout de suite
  revalidatePath("/", "layout");
  return { ok: true, message: "Tes informations ont été enregistrées." };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Saisis ton mot de passe actuel"),
    password: z
      .string()
      .min(8, "Le nouveau mot de passe doit faire au moins 8 caractères")
      .max(100)
      .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Le nouveau mot de passe doit contenir au moins une lettre et un chiffre"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Les deux nouveaux mots de passe ne correspondent pas", path: ["confirm"] });

export async function changePassword(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSessionCustomer();
  if (!session) return { error: "Session expirée : reconnecte-toi." };
  const parsed = passwordSchema.safeParse({
    current: String(formData.get("current") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides" };

  const row = await db.query.customers.findFirst({ where: eq(customers.id, session.id), columns: { passwordHash: true } });
  if (!row || !(await bcrypt.compare(parsed.data.current, row.passwordHash))) {
    return { error: "Mot de passe actuel incorrect." };
  }
  if (parsed.data.current === parsed.data.password) return { error: "Choisis un mot de passe différent de l'actuel." };

  await db
    .update(customers)
    .set({ passwordHash: await bcrypt.hash(parsed.data.password, 10) })
    .where(eq(customers.id, session.id));
  return { ok: true, message: "Mot de passe modifié." };
}
