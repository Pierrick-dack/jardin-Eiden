// Génération du lien WhatsApp pré-rempli avec le détail d'une commande.
// Gratuit, aucune configuration : ouvre WhatsApp avec le message déjà écrit.
// Évolution possible : brancher l'API WhatsApp Business (Meta Cloud API) pour
// un envoi 100% automatique — voir README.
import { formatPrice } from "./utils";

type OrderForWhatsApp = {
  reference: string;
  customerName: string;
  customerPhone: string;
  deliveryCity: string;
  deliveryAddress: string;
  deliveryNote?: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod?: string | null;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
};

/**
 * Construit le message texte de la commande.
 */
export function buildOrderMessage(order: OrderForWhatsApp): string {
  const lines: string[] = [];
  lines.push(`🌿 *NOUVELLE COMMANDE — Le Jardin d'Eïden*`);
  lines.push(`Référence : *${order.reference}*`);
  lines.push("");
  lines.push(`👤 Client : ${order.customerName}`);
  lines.push(`📞 Téléphone : ${order.customerPhone}`);
  lines.push("");
  lines.push(`📦 *Articles :*`);
  for (const it of order.items) {
    lines.push(
      `• ${it.quantity} × ${it.productName} — ${formatPrice(it.lineTotal)}`
    );
  }
  lines.push("");
  lines.push(`Sous-total : ${formatPrice(order.subtotal)}`);
  if (order.deliveryFee > 0) {
    lines.push(`Livraison : ${formatPrice(order.deliveryFee)}`);
  }
  lines.push(`*TOTAL : ${formatPrice(order.total)}*`);
  if (order.paymentMethod) {
    lines.push(`💳 Paiement : ${order.paymentMethod} (confirmé ✅)`);
  }
  lines.push("");
  lines.push(`🚚 *Livraison :*`);
  lines.push(`${order.deliveryCity}`);
  lines.push(`${order.deliveryAddress}`);
  if (order.deliveryNote) {
    lines.push(`Note : ${order.deliveryNote}`);
  }
  return lines.join("\n");
}

/**
 * Lien wa.me vers le numéro business de la boutique, message pré-rempli.
 * Utilisé côté serveur pour notifier l'équipe après paiement confirmé.
 */
export function buildBusinessWhatsAppLink(order: OrderForWhatsApp): string {
  const number = (process.env.WHATSAPP_BUSINESS_NUMBER || "").replace(
    /[^0-9]/g,
    ""
  );
  const text = encodeURIComponent(buildOrderMessage(order));
  return `https://wa.me/${number}?text=${text}`;
}
