import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";

// Polices auto-hébergées (fichiers fournis par @fontsource, servis localement —
// pas de dépendance à Google Fonts au build ni à l'exécution).
const fraunces = localFont({
  src: "../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2",
  variable: "--font-fraunces",
  display: "swap",
});

const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  display: "swap",
});

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Le Jardin d'Eïden";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Beauté & soins`,
    template: `%s · ${siteName}`,
  },
  description:
    "Produits de beauté et de soin pour homme et femme : soins visage, corps, cheveux, parfums et maquillage. Commande en ligne, paiement Mobile Money, livraison au Cameroun.",
  openGraph: {
    type: "website",
    siteName,
    locale: "fr_FR",
  },
  twitter: { card: "summary_large_image" },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    // suppressHydrationWarning : certaines extensions de navigateur injectent
    // des attributs sur <html> avant l'hydratation (ex. data-processed-*).
    <html
      lang="fr"
      className={`${fraunces.variable} ${inter.variable}`}
      // Défilement doux pour les ancres (#avis…), désactivé par Next.js
      // pendant les changements de page
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      {/* En-tête, pied de page et panier : app/(boutique)/layout.tsx ; interface admin : app/admin */}
      <body>{children}</body>
    </html>
  );
}
