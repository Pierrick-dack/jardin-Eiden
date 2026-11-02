import { NextResponse } from "next/server";
import { confirmEmail } from "@/lib/email-verification";
import { safeNext } from "@/lib/customer-auth";

// Lien reçu par email : valide le jeton puis redirige vers la page de résultat.
// (Route Handler plutôt que page : la confirmation modifie la base.)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const confirmed = await confirmEmail(searchParams.get("token") ?? "");
  const target = new URL("/confirmer-email", request.url);
  target.searchParams.set("statut", confirmed ? "ok" : "invalide");
  const next = safeNext(searchParams.get("next"), "");
  if (next) target.searchParams.set("next", next);
  return NextResponse.redirect(target);
}
