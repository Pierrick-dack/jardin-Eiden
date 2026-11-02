"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { HeaderMenu } from "./header-menu";
import { useCart } from "./cart-context";
import { formatPrice } from "@/lib/utils";
import { logoutAction } from "@/app/(boutique)/connexion/actions";

export type BuyAgainItem = { productId: string; slug: string; name: string; price: number; stock: number; image?: string };

const accountLinks = [
  { href: "/compte", label: "Mon compte" },
  { href: "/compte#orders-title", label: "Mes commandes" },
  { href: "/compte#orders-title", label: "Suivre une commande" },
  { href: "/compte#addresses-title", label: "Mes adresses de livraison" },
  { href: "/panier", label: "Mon panier" },
];

const shopLinks = [
  { href: "/boutique?genre=femme", label: "Femme" },
  { href: "/boutique?genre=homme", label: "Homme" },
  { href: "/boutique?genre=enfants", label: "Enfants" },
  { href: "/boutique?tri=nouveautes", label: "Nouveautés" },
  { href: "/boutique", label: "Tout le catalogue" },
];

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

/** « Bonjour Prénom / Compte et commandes » + menu déroulant */
export function AccountMenu({ firstName, avatarUrl, buyAgain }: { firstName: string | null; avatarUrl?: string | null; buyAgain: BuyAgainItem[] }) {
  const trigger = (
    <span className="am-trigger">
      {avatarUrl ? (
        <span className="am-avatar">
          <Image src={avatarUrl} alt="" width={30} height={30} />
        </span>
      ) : (
        <UserIcon />
      )}
      <span className="am-label">
        <small>{firstName ? `Bonjour ${firstName}` : "Bonjour, identifie-toi"}</small>
        <strong>Compte et commandes</strong>
      </span>
    </span>
  );

  return (
    <HeaderMenu trigger={trigger} label={firstName ? `Mon compte (${firstName})` : "Compte : se connecter"} width={firstName ? 620 : 400}>
      {firstName ? <SignedIn firstName={firstName} buyAgain={buyAgain} /> : <Guest />}
      <style>{`
        .am-trigger { display: inline-flex; align-items: center; gap: 8px; color: var(--forest); }
        .am-label { display: grid; line-height: 1.15; }
        .am-avatar { width: 30px; height: 30px; border-radius: 999px; overflow: hidden; display: inline-block; flex-shrink: 0; box-shadow: 0 0 0 2px var(--foliage-soft); }
        .am-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .am-label small { font-size: 0.72rem; color: var(--muted); }
        .am-label strong { font-size: 0.88rem; color: var(--ink); white-space: nowrap; }
        .am-grid { display: grid; grid-template-columns: 1.1fr 1fr; }
        .am-col { padding: 1.2rem 1.35rem; }
        .am-col + .am-col { border-left: 1px solid var(--line); }
        .am-col h3 { font-size: 1.02rem; color: var(--forest); margin: 0 0 0.75rem; }
        .am-links { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.1rem; }
        .am-links a, .am-links button {
          display: block; width: 100%; text-align: left; padding: 0.38rem 0.5rem; margin: 0 -0.5rem; border-radius: 0.45rem;
          color: var(--ink); text-decoration: none; font: inherit; font-size: 0.9rem; background: none; border: none; cursor: pointer;
        }
        .am-links a:hover, .am-links button:hover { background: var(--ivory-deep); color: var(--foliage); }
        .am-sep { height: 1px; background: var(--line); margin: 0.6rem 0; }
        .am-item { display: grid; grid-template-columns: 64px 1fr; gap: 0.75rem; align-items: center; padding: 0.55rem 0; }
        .am-item + .am-item { border-top: 1px solid var(--line); }
        .am-thumb { position: relative; width: 64px; height: 64px; border-radius: 0.6rem; overflow: hidden; background: var(--ivory-deep); display: block; }
        .am-name { font-size: 0.85rem; color: var(--ink); text-decoration: none; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .am-name:hover { color: var(--foliage); text-decoration: underline; }
        .am-price { font-size: 0.85rem; font-weight: 700; color: var(--foliage); margin: 0.15rem 0 0.3rem; }
        .am-add { padding: 0.28rem 0.75rem; font-size: 0.75rem; border-radius: 999px; border: none; background: var(--brass); color: var(--forest); font-weight: 600; cursor: pointer; }
        .am-add:hover { filter: brightness(1.05); }
        .am-add:disabled { opacity: 0.55; cursor: default; }
        .am-empty { font-size: 0.85rem; color: var(--muted); margin: 0; line-height: 1.55; }
        .am-guest { padding: 1.35rem; display: grid; gap: 0.75rem; text-align: center; }
        @media (max-width: 720px) {
          .am-label strong { font-size: 0.8rem; }
          .am-grid { grid-template-columns: 1fr; }
          .am-col + .am-col { border-left: none; border-top: 1px solid var(--line); }
        }
        @media (max-width: 420px) { .am-label { display: none; } }
      `}</style>
    </HeaderMenu>
  );
}

function Guest() {
  return (
    <div>
      <div className="am-guest">
        <Link href="/connexion" className="btn btn-primary" style={{ width: "100%" }}>
          Se connecter
        </Link>
        <p className="am-empty">
          Nouveau client ?{" "}
          <Link href="/inscription" style={{ color: "var(--foliage)", fontWeight: 600 }}>
            Créer un compte
          </Link>
        </p>
      </div>
      <div className="am-col" style={{ borderTop: "1px solid var(--line)" }}>
        <h3>Découvrir</h3>
        <ul className="am-links">
          {shopLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href}>{l.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SignedIn({ firstName, buyAgain }: { firstName: string; buyAgain: BuyAgainItem[] }) {
  return (
    <div className="am-grid">
      <div className="am-col">
        <h3>Acheter à nouveau</h3>
        {buyAgain.length === 0 ? (
          <p className="am-empty">
            Tes produits achetés apparaîtront ici pour les recommander en un clic.{" "}
            <Link href="/boutique" style={{ color: "var(--foliage)" }}>
              Découvrir la boutique
            </Link>
          </p>
        ) : (
          buyAgain.map((item) => <BuyAgainRow key={item.productId} item={item} />)
        )}
        <div className="am-sep" />
        <h3 style={{ marginTop: "0.4rem" }}>Découvrir</h3>
        <ul className="am-links">
          {shopLinks.slice(0, 4).map((l) => (
            <li key={l.href}>
              <Link href={l.href}>{l.label}</Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="am-col">
        <h3>Ton compte</h3>
        <ul className="am-links">
          {accountLinks.map((l) => (
            <li key={l.label}>
              <Link href={l.href}>{l.label}</Link>
            </li>
          ))}
        </ul>
        <div className="am-sep" />
        <ul className="am-links">
          <li>
            <Link href="/connexion">Utiliser un autre compte</Link>
          </li>
          <li>
            <form action={logoutAction}>
              <button type="submit">Se déconnecter ({firstName})</button>
            </form>
          </li>
        </ul>
      </div>
    </div>
  );
}

function BuyAgainRow({ item }: { item: BuyAgainItem }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = item.stock <= 0;
  return (
    <div className="am-item">
      <Link href={`/produit/${item.slug}`} className="am-thumb" aria-hidden tabIndex={-1}>
        {item.image && <Image src={item.image} alt="" fill sizes="64px" style={{ objectFit: "cover" }} />}
      </Link>
      <div style={{ minWidth: 0 }}>
        <Link href={`/produit/${item.slug}`} className="am-name">
          {item.name}
        </Link>
        <p className="am-price">{formatPrice(item.price)}</p>
        <button
          type="button"
          className="am-add"
          disabled={soldOut}
          onClick={() => {
            add({ productId: item.productId, slug: item.slug, name: item.name, price: item.price, image: item.image, stock: item.stock });
            setAdded(true);
            setTimeout(() => setAdded(false), 1800);
          }}
        >
          {soldOut ? "Épuisé" : added ? "✓ Ajouté" : "Ajouter au panier"}
        </button>
      </div>
    </div>
  );
}
