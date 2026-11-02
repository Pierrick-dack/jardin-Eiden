// Authentification admin minimale par cookie signé (HMAC).
// Suffisant pour un back-office à un seul opérateur. Pour plusieurs rôles,
// envisager NextAuth/Auth.js plus tard.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { adminUsers } from "./db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createToken, readToken } from "./signed-token";

const COOKIE = "eiden_admin";
const SCOPE = "admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

/** Vérifie identifiants et crée la session. Retourne true si succès. */
export async function login(email: string, password: string): Promise<boolean> {
  const admin = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email.trim().toLowerCase()),
  });
  if (!admin) {
    // Comparaison factice pour limiter le timing attack
    await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinv");
    return false;
  }
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return false;

  const store = await cookies();
  store.set(COOKIE, createToken(SCOPE, admin.id, MAX_AGE), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return true;
}

export async function logout() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Retourne l'admin connecté, ou null. */
export async function getCurrentAdmin() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const adminId = readToken(SCOPE, token);
  if (!adminId) return null;
  const admin = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, adminId),
  });
  return admin ?? null;
}

/** Pages admin : redirige vers la connexion admin si besoin. */
export async function requireAdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** À appeler en tête de chaque action/page admin. Lève si non connecté. */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("UNAUTHORIZED");
  return admin;
}
