import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  return (
    <footer
      style={{
        background: "var(--forest)",
        color: "var(--ivory)",
        marginTop: "5rem",
      }}
    >
      <div
        className="wrap"
        style={{ padding: "3rem 1.25rem 2rem", display: "grid", gap: "2rem" }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "2rem",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ maxWidth: 340 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                color: "var(--brass)",
                marginBottom: "0.75rem",
              }}
            >
              <BrandMark size={28} />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.15rem",
                  fontWeight: 600,
                  color: "var(--ivory)",
                }}
              >
                Le Jardin d&apos;Eïden
              </span>
            </div>
            <p
              style={{
                fontSize: "0.9rem",
                lineHeight: 1.6,
                opacity: 0.85,
                margin: 0,
              }}
            >
              Soins et beauté pour homme et femme. Commande en ligne, paiement
              Mobile Money, livraison partout au Cameroun.
            </p>
          </div>

          <div style={{ fontSize: "0.9rem", lineHeight: 2 }}>
            <strong
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontFamily: "var(--font-display)",
              }}
            >
              Navigation
            </strong>
            <Link href="/" style={{ color: "var(--ivory)", opacity: 0.85, display: "block", textDecoration: "none" }}>
              Boutique
            </Link>
            <Link href="/panier" style={{ color: "var(--ivory)", opacity: 0.85, display: "block", textDecoration: "none" }}>
              Mon panier
            </Link>
          </div>

          <div style={{ fontSize: "0.9rem", lineHeight: 2 }}>
            <strong
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontFamily: "var(--font-display)",
              }}
            >
              Nous contacter
            </strong>
            <span style={{ opacity: 0.85, display: "block" }}>
              WhatsApp & commandes
            </span>
            <span style={{ opacity: 0.85, display: "block" }}>Yaoundé, Cameroun</span>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(251,247,239,0.15)",
            paddingTop: "1.25rem",
            fontSize: "0.8rem",
            opacity: 0.7,
          }}
        >
          © 2026 Le Jardin d&apos;Eïden. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
