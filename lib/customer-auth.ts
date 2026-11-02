// Comptes clients : inscription, connexion, session par cookie signé.
// Le compte est obligatoire pour commander (email = confirmation, facture,
// récapitulatif) et pour publier un avis. La navigation et le panier restent libres.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cacheLife } from "next/cache";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { customers } from "./db/schema";
import { createToken, readToken } from "./signed-token";
import { normalizeCameroonPhone } from "./utils";

const COOKIE = "eiden_client";
const SCOPE = "client";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

// Vrai hash bcrypt (calculé une fois) pour les comparaisons factices
const DUMMY_HASH = bcrypt.hashSync("compte-inexistant", 10);

export const normalizeEmail =(email: string) => email.trim().toLowerCase();

async function openSession(customerId: string) {
  (await cookies()).set(COOKIE, createToken(SCOPE, customerId, MAX_AGE), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function registerCustomer(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ ok: true; customer: typeof customers.$inferSelect } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email);
  const existing = await db.query.customers.findFirst({
    where: eq(customers.email, email),
    columns: { id: true },
  });
  if (existing) {
    return { ok: false, error: "Un compte existe déjà avec cet email. Connecte-toi." };
  }
  const [row] = await db
    .insert(customers)
    .values({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      phone: normalizeCameroonPhone(input.phone),
      passwordHash: await bcrypt.hash(input.password, 10),
    })
    .returning();
  await openSession(row.id);
  return { ok: true, customer: row };
}

/** Vérifie les identifiants et ouvre la session. Message générique en cas d'échec. */
export async function loginCustomer(email: string, password: string) {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.email, normalizeEmail(email)),
  });
  // Comparaison factice si le compte n'existe pas : même durée de réponse
  const ok = await bcrypt.compare(password, customer?.passwordHash ?? DUMMY_HASH);
  if (!customer || !ok) return false;
  await openSession(customer.id);
  return true;
}

export async function logoutCustomer() {
  (await cookies()).delete(COOKIE);
}

/**
 * Client de la session (sans le mot de passe), ou null.
 * Version sans cache : à utiliser dans les Server Actions, qui doivent
 * toujours revérifier la session elles-mêmes.
 */
export async function getSessionCustomer() {
  const token = (await cookies()).get(COOKIE)?.value;
  const id = token ? readToken(SCOPE, token) : null;
  if (!id) return null;
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, id),
    columns: { passwordHash: false },
  });
  return customer ?? null;
}

/**
 * Même chose pour le rendu des pages et composants. `use cache: private` :
 * lecture de session à la requête (vérifie l'expiration du jeton), résultat
 * propre à ce visiteur, jamais partagé ni stocké côté serveur. La connexion et
 * la déconnexion modifient le cookie, ce qui vide le cache du navigateur.
 */
export async function getCurrentCustomer() {
  "use cache: private";
  // 30 s côté navigateur (minimum) : une confirmation d'email faite dans un
  // autre onglet est prise en compte rapidement
  cacheLife({ stale: 30 });
  return getSessionCustomer();
}

export type CurrentCustomer = NonNullable<Awaited<ReturnType<typeof getCurrentCustomer>>>;

/** Pages réservées : redirige vers la connexion puis revient sur `next` */
export async function requireCustomerPage(next: string) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return customer;
}

/** N'accepte que des chemins internes (évite les redirections vers un autre site) */
export function safeNext(next: unknown, fallback = "/compte") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
