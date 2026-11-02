import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentCustomer, safeNext } from "@/lib/customer-auth";
import { ResendVerification } from "@/components/resend-verification";
import { VERIFY_LINK_MINUTES } from "@/lib/email-verification";

export const metadata: Metadata = { title: "Confirmation de ton email", robots: { index: false } };

type SearchParams = Promise<{ statut?: string; next?: string; envoi?: string }>;

export default function ConfirmEmailPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="wrap" style={{ paddingTop: "3rem", paddingBottom: "4rem" }}>
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          textAlign: "center",
          border: "1px solid var(--line)",
          borderRadius: "1.25rem",
          background: "#fff",
          padding: "clamp(1.75rem, 5vw, 3rem)",
        }}
      >
        <Suspense fallback={<p style={{ color: "var(--muted)" }}>Chargement…</p>}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);

  if (sp.statut === "ok") {
    return (
      <>
        <p style={{ fontSize: "2.6rem", margin: 0 }}>🌿</p>
        <h1 style={{ fontSize: "1.8rem", color: "var(--forest)", margin: "0.5rem 0" }}>Adresse email confirmée !</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 1.5rem" }}>Ton compte est actif. Tu peux maintenant passer commande.</p>
        <Link href={next} className="btn btn-primary">
          {next.startsWith("/checkout") ? "Finaliser ma commande" : "Continuer"}
        </Link>
      </>
    );
  }

  const customer = await getCurrentCustomer();

  if (sp.statut === "invalide") {
    return (
      <>
        <p style={{ fontSize: "2.6rem", margin: 0 }}>⏳</p>
        <h1 style={{ fontSize: "1.7rem", color: "var(--forest)", margin: "0.5rem 0" }}>Lien expiré ou invalide</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 1.5rem" }}>
          Ce lien de confirmation n&apos;est plus valable (il expire après {VERIFY_LINK_MINUTES} minutes).
        </p>
        {customer && !customer.emailVerifiedAt ? (
          <div style={{ display: "grid", justifyItems: "center" }}>
            <ResendVerification next={next} label="Recevoir un nouveau lien" />
          </div>
        ) : (
          <Link href={`/connexion?next=${encodeURIComponent(next)}`} className="btn btn-primary">
            Se connecter pour recevoir un nouveau lien
          </Link>
        )}
      </>
    );
  }

  if (customer?.emailVerifiedAt) {
    return (
      <>
        <h1 style={{ fontSize: "1.7rem", color: "var(--forest)", margin: "0 0 0.5rem" }}>Ton email est déjà confirmé</h1>
        <Link href={next} className="btn btn-primary" style={{ marginTop: "1rem" }}>
          Continuer
        </Link>
      </>
    );
  }

  // Inscription faite mais l'email n'a pas pu partir (service d'envoi indisponible)
  if (customer && sp.envoi === "echec") {
    return (
      <>
        <p style={{ fontSize: "2.6rem", margin: 0 }}>⚠️</p>
        <h1 style={{ fontSize: "1.7rem", color: "var(--forest)", margin: "0.5rem 0" }}>Ton compte est créé</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
          Mais l&apos;email de confirmation n&apos;a pas pu être envoyé à{" "}
          <strong style={{ color: "var(--ink)" }}>{customer.email}</strong>. Réessaie dans quelques instants :
        </p>
        <div style={{ display: "grid", justifyItems: "center" }}>
          <ResendVerification next={next} label="Envoyer l'email de confirmation" />
        </div>
      </>
    );
  }

  // Juste après l'inscription : invitation à ouvrir sa messagerie
  return (
    <>
      <p style={{ fontSize: "2.6rem", margin: 0 }}>📬</p>
      <h1 style={{ fontSize: "1.8rem", color: "var(--forest)", margin: "0.5rem 0" }}>Vérifie ta boîte mail</h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
        {customer ? (
          <>
            Nous avons envoyé un lien de confirmation à <strong style={{ color: "var(--ink)" }}>{customer.email}</strong>.
            Clique dessus pour activer ton compte : c&apos;est nécessaire pour passer commande.
          </>
        ) : (
          "Nous t'avons envoyé un lien de confirmation par email. Clique dessus pour activer ton compte."
        )}
      </p>
      {customer && (
        <div style={{ display: "grid", justifyItems: "center", gap: "1rem" }}>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>Rien reçu ? Regarde dans tes spams, ou :</p>
          <ResendVerification next={next} />
          <Link href="/boutique" className="link-muted" style={{ fontSize: "0.9rem" }}>
            Continuer mes achats en attendant
          </Link>
        </div>
      )}
    </>
  );
}
