import Image from "next/image";
import type { ReactNode } from "react";

/** Mise en page des écrans connexion / inscription : formulaire + affiche de marque */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="wrap" style={{ paddingTop: "2.5rem", paddingBottom: "3.5rem" }}>
      <div className="auth-shell">
        <div className="auth-visual" aria-hidden>
          <Image src="/brand/posters/pour-elle.jpg" alt="" fill sizes="(max-width: 860px) 0px, 520px" style={{ objectFit: "cover" }} />
          <div className="poster-shade" />
          <div style={{ position: "relative", padding: "2rem", color: "#fff", alignSelf: "end" }}>
            <p className="section-eyebrow" style={{ color: "var(--brass)" }}>Le Jardin d&apos;Eïden</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.7rem", lineHeight: 1.2, margin: 0 }}>
              Ta beauté au naturel, livrée chez toi.
            </p>
            <ul style={{ margin: "1rem 0 0", padding: 0, listStyle: "none", display: "grid", gap: "0.4rem", fontSize: "0.92rem", opacity: 0.92 }}>
              <li>✓ Paiement Mobile Money sécurisé</li>
              <li>✓ Suivi de toutes tes commandes</li>
              <li>✓ Recommandations selon tes goûts</li>
            </ul>
          </div>
        </div>

        <div className="auth-card">
          <h1 style={{ fontSize: "clamp(1.7rem, 3vw, 2.1rem)", color: "var(--forest)" }}>{title}</h1>
          <p style={{ margin: "0.4rem 0 1.5rem", color: "var(--muted)" }}>{subtitle}</p>
          {children}
        </div>
      </div>

      <style>{`
        .auth-shell {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
          max-width: 1040px;
          margin: 0 auto;
          border: 1px solid var(--line);
          border-radius: 1.25rem;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 12px 40px rgba(30,58,43,0.08);
        }
        .auth-visual { position: relative; display: flex; min-height: 560px; }
        .auth-card { padding: clamp(1.5rem, 4vw, 3rem); }
        @media (max-width: 860px) {
          .auth-shell { grid-template-columns: 1fr; }
          .auth-visual { display: none; }
        }
      `}</style>
    </div>
  );
}
