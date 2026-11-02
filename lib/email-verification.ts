// Confirmation de l'adresse email des clients.
// Lien signé valable 15 min envoyé à l'inscription (et sur demande) ; tant que
// l'email n'est pas confirmé, le client ne peut pas passer commande.
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { customers } from "./db/schema";
import { sendEmail } from "./email";
import { verifyEmailTemplate } from "./email-templates";
import { createToken, readToken } from "./signed-token";

const SCOPE = "verify-email";
/** Durée de validité du lien de confirmation (email et pages l'affichent) */
export const VERIFY_LINK_MINUTES = 15;
const RESEND_DELAY_MS = 60 * 1000; // un renvoi par minute au plus

/** Envoie le lien de confirmation. `next` = page où revenir après confirmation. */
export async function sendVerificationEmail(
  customer: { id: string; email: string; firstName: string; verificationSentAt: Date | null },
  next = "/compte"
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (customer.verificationSentAt && Date.now() - customer.verificationSentAt.getTime() < RESEND_DELAY_MS) {
    return { ok: false, error: "Un email vient d'être envoyé. Patiente une minute avant d'en demander un autre." };
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const url = new URL("/confirmer-email/valider", base);
  url.searchParams.set("token", createToken(SCOPE, customer.id, VERIFY_LINK_MINUTES * 60));
  if (next !== "/compte") url.searchParams.set("next", next);

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n🔗 Lien de validation du compte ${customer.email} :\n   ${url.toString()}\n`);
  }
  const sent = await sendEmail(verifyEmailTemplate(customer, url.toString(), VERIFY_LINK_MINUTES));
  if (!sent.ok) return { ok: false, error: "L'email n'a pas pu être envoyé. Réessaie dans quelques instants." };
  await db.update(customers).set({ verificationSentAt: new Date() }).where(eq(customers.id, customer.id));
  return { ok: true };
}

/** Valide le lien reçu par email ; renvoie le prénom du client confirmé, ou null */
export async function confirmEmail(token: string) {
  const id = readToken(SCOPE, token);
  if (!id) return null;
  const [row] = await db
    .update(customers)
    // Garde la date de la 1re confirmation si le lien est recliqué
    .set({ emailVerifiedAt: sql`coalesce(${customers.emailVerifiedAt}, now())` })
    .where(eq(customers.id, id))
    .returning({ firstName: customers.firstName });
  return row ?? null;
}
