"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getSessionCustomer, loginCustomer, logoutCustomer, registerCustomer, safeNext } from "@/lib/customer-auth";
import { sendVerificationEmail } from "@/lib/email-verification";
import { notify } from "@/lib/notifications";

export type AuthState = {
  error?: string;
  // Valeurs à réafficher après une erreur (jamais le mot de passe)
  values?: Record<string, string>;
};

const signupSchema = z
  .object({
    firstName: z.string().trim().min(2, "Ton prénom est trop court").max(60),
    lastName: z.string().trim().min(2, "Ton nom est trop court").max(60),
    email: z.string().trim().email("Adresse email invalide").max(160),
    phone: z
      .string()
      .trim()
      .refine((v) => v.replace(/\D/g, "").length >= 9, "Numéro de téléphone invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit faire au moins 8 caractères")
      .max(100)
      .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Le mot de passe doit contenir au moins une lettre et un chiffre"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Les deux mots de passe ne correspondent pas", path: ["confirm"] });

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(
    ["firstName", "lastName", "email", "phone", "password", "confirm"].map((k) => [k, String(formData.get(k) ?? "")])
  );
  const values = { firstName: raw.firstName, lastName: raw.lastName, email: raw.email, phone: raw.phone };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides", values };

  const res = await registerCustomer(parsed.data);
  if (!res.ok) return { error: res.error, values };
  await notify({ audience: "ADMIN" }, {
    title: "👤 Nouveau client inscrit",
    body: `${res.customer.firstName} ${res.customer.lastName} · ${res.customer.email}`,
    href: "/admin/clients",
  });

  // Lien de confirmation par email ; le compte est créé même si l'envoi échoue
  // (le client pourra redemander un lien depuis la page de confirmation)
  const next = safeNext(formData.get("next"));
  const sent = await sendVerificationEmail(res.customer, next);
  redirect(`/confirmer-email?next=${encodeURIComponent(next)}${sent.ok ? "" : "&envoi=echec"}`);
}

/** Renvoie le lien de confirmation au client connecté */
export async function resendVerificationAction(_prev: ResendState, formData: FormData): Promise<ResendState> {
  const customer = await getSessionCustomer();
  if (!customer) return { error: "Ta session a expiré. Reconnecte-toi." };
  if (customer.emailVerifiedAt) return { sent: true };
  const res = await sendVerificationEmail(customer, safeNext(formData.get("next")));
  return res.ok ? { sent: true } : { error: res.error };
}

export type ResendState = { sent?: boolean; error?: string };

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email et mot de passe requis.", values: { email } };

  if (!(await loginCustomer(email, password))) {
    return { error: "Email ou mot de passe incorrect.", values: { email } };
  }
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  await logoutCustomer();
  redirect("/");
}
