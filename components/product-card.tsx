import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { audienceLabel } from "@/lib/audience";
import type { Audience } from "@/lib/db/schema";

type Props = {
  slug: string;
  name: string;
  price: number;
  stock: number;
  audience: Audience;
  image?: string;
  /** À activer pour les cartes visibles sans défilement (meilleur LCP). */
  eager?: boolean;
};

/**
 * Carte produit : nom limité à 2 lignes. Au survol (souris), la carte
 * s'agrandit, s'entoure d'un liseré vert et affiche le nom complet.
 * La carte visible est posée sur une « cale » invisible de même taille :
 * en s'agrandissant elle passe par-dessus ses voisines, sans décaler la grille.
 */
export function ProductCard({ slug, name, price, stock, audience, image, eager = false }: Props) {
  const soldOut = stock <= 0;
  return (
    <div className="pc">
      {/* Cale : réserve la place de la carte au repos */}
      <div className="pc-spacer" aria-hidden>
        <div className="pc-media-box" />
        <div className="pc-info">
          <span className="pc-name">{name}</span>
          <span className="pc-price">{formatPrice(price)}</span>
        </div>
      </div>

      <Link href={`/produit/${slug}`} className="pc-face" title={name}>
        <div className="pc-media-box pc-media">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              loading={eager ? "eager" : "lazy"}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              style={{ objectFit: "cover" }}
            />
          ) : null}
          <span className="chip pc-chip">{audienceLabel[audience]}</span>
          {soldOut && <span className="chip pc-soldout">Épuisé</span>}
        </div>
        <div className="pc-info">
          <h3 className="pc-name">{name}</h3>
          <span className="pc-price">{formatPrice(price)}</span>
        </div>
      </Link>

    </div>
  );
}
