import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentCustomer, safeNext } from "@/lib/customer-auth";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

type SearchParams = Promise<{ next?: string }>;

export default function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthShell title="Créer un compte" subtitle="Quelques secondes suffisent pour commander et suivre tes livraisons.">
      <Suspense fallback={null}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Gate({ searchParams }: { searchParams: SearchParams }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentCustomer()) redirect(next);
  return <SignupForm next={next} />;
}
