import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentCustomer, safeNext } from "@/lib/customer-auth";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

type SearchParams = Promise<{ next?: string }>;

/** Message selon la page qui a demandé la connexion */
function authNotice(next: string) {
  if (next.startsWith("/checkout")) return "Connecte-toi pour finaliser ta commande : ton panier est conservé.";
  if (next.startsWith("/produit")) return "Connecte-toi pour laisser un avis sur ce produit.";
  if (next.startsWith("/commande") || next.startsWith("/compte")) return "Connecte-toi pour accéder à tes commandes.";
  return undefined;
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthShell title="Connexion" subtitle="Heureux de te revoir ! Connecte-toi à ton compte.">
      <Suspense fallback={null}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Gate({ searchParams }: { searchParams: SearchParams }) {
  const next = safeNext((await searchParams).next);
  // Déjà connecté : inutile de rester sur cette page
  if (await getCurrentCustomer()) redirect(next);
  return <LoginForm next={next} notice={authNotice(next)} />;
}
