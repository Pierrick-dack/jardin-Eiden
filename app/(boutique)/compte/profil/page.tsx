import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireCustomerPage } from "@/lib/customer-auth";
import { PasswordForm, ProfileForm } from "./profile-forms";

export const metadata = { title: "Mes informations personnelles", robots: { index: false } };

export default function ProfilePage() {
  return (
    <div className="wrap" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
      <nav style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
        <Link href="/compte" className="link-muted">
          Mon compte
        </Link>
        <span style={{ color: "var(--muted)" }}> / Informations personnelles</span>
      </nav>
      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.1rem)", color: "var(--forest)", margin: "0 0 0.4rem" }}>Mes informations personnelles</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 1.75rem" }}>Modifie ton nom, ton téléphone, ta photo de profil et ton mot de passe.</p>
      <Suspense fallback={<p style={{ color: "var(--muted)" }}>Chargement…</p>}>
        <ProfileContent />
      </Suspense>
      <style>{`
        .pf-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 1.5rem; align-items: start; max-width: 1080px; }
        .pf-card { display: grid; gap: 1rem; padding: clamp(1.1rem, 3vw, 1.75rem); background: #fff; border: 1px solid var(--line); border-radius: 1rem; }
        .pf-card h2 { font-size: 1.25rem; color: var(--forest); margin: 0; }
        .pf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .pf-hint { display: block; font-size: 0.78rem; color: var(--muted); margin-top: 4px; }
        .pf-avatar-row { display: flex; gap: 1.1rem; align-items: center; flex-wrap: wrap; }
        .pf-avatar {
          position: relative; width: 96px; height: 96px; border-radius: 999px; overflow: hidden; flex-shrink: 0;
          background: var(--foliage-soft); color: var(--foliage); display: grid; place-items: center;
          font-size: 2rem; font-weight: 600; border: 3px solid #fff; box-shadow: 0 0 0 1px var(--line);
        }
        .pf-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .pf-avatar-loading { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(251,247,239,0.8); }
        .pf-spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--line); border-top-color: var(--foliage); animation: pf-spin 0.8s linear infinite; }
        .pf-small { padding: 0.4rem 0.9rem; font-size: 0.85rem; }
        .pf-link { background: none; border: none; color: var(--danger); text-decoration: underline; }
        @keyframes pf-spin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) { .pf-grid { grid-template-columns: 1fr; } }
        @media (max-width: 520px) { .pf-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

async function ProfileContent() {
  await connection();
  const customer = await requireCustomerPage("/compte/profil");
  return (
    <div className="pf-grid">
      <ProfileForm
        profile={{
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          avatarUrl: customer.avatarUrl ?? null,
        }}
      />
      <PasswordForm />
    </div>
  );
}
