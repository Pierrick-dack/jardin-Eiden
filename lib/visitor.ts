// Identifiant visiteur anonyme (cookie), pour personnaliser les recommandations
// sans compte client. Aucune donnée personnelle : juste un identifiant aléatoire.
import { cookies } from "next/headers";
import { createId } from "@paralleldrive/cuid2";

const COOKIE = "jde_vid";

/** Lecture seule (Server Components) : undefined si nouveau visiteur */
export async function getVisitorId() {
  return (await cookies()).get(COOKIE)?.value;
}

/** Lecture ou création (Server Actions uniquement : seules à pouvoir écrire un cookie) */
export async function ensureVisitorId() {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing) return existing;
  const id = createId();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 an
    path: "/",
  });
  return id;
}
