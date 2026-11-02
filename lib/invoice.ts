// Factures PDF des commandes (pdf-lib, polices standard intégrées).
// Une facture n'existe que pour une commande payée.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Order, OrderItem } from "./db/schema";
import { formatPrice } from "./utils";

export type OrderWithItems = Order & { items: OrderItem[] };

/** Payée = encaissée : paiement en ligne réussi ou encaissement enregistré par l'admin */
export function isOrderPaid(order: Pick<Order, "payment">) {
  return order.payment === "REUSSI";
}

export const invoiceNumber = (order: Pick<Order, "reference">) => `FAC-${order.reference}`;
export const invoiceFileName = (order: Pick<Order, "reference">) => `facture-${order.reference}.pdf`;

const paymentMethodLabel: Record<string, string> = {
  MTN_MOMO: "MTN Mobile Money",
  ORANGE_MONEY: "Orange Money",
  ESPECES: "Espèces",
  VIREMENT: "Virement",
};
export function paymentLabel(order: Pick<Order, "paymentMethod" | "payment">) {
  if (order.paymentMethod) return paymentMethodLabel[order.paymentMethod] ?? order.paymentMethod;
  return order.payment === "REUSSI" ? "Mobile Money" : "Paiement à la livraison / WhatsApp";
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: "Africa/Douala" });
export const formatDate = (d: Date) => dateFmt.format(d);

// Les polices standard PDF (WinAnsi) ne connaissent pas certaines espaces
// insécables ni les emojis : on les remplace ou les retire.
const KEEP = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
function pdfText(s: string) {
  return s
    .replace(/[   ]/g, " ")
    .split("")
    .filter((c) => c.charCodeAt(0) <= 0xff || KEEP.includes(c))
    .join("");
}

const C = {
  forest: rgb(0.118, 0.227, 0.169),
  foliage: rgb(0.176, 0.361, 0.259),
  brass: rgb(0.788, 0.635, 0.294),
  ink: rgb(0.125, 0.125, 0.11),
  muted: rgb(0.416, 0.416, 0.376),
  line: rgb(0.894, 0.867, 0.804),
  ivory: rgb(0.984, 0.969, 0.937),
  success: rgb(0.176, 0.416, 0.29),
};

/** Coupe un texte en lignes tenant dans `width` points */
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = pdfText(text).split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > width && current) {
      lines.push(current);
      current = w;
    } else current = test;
  }
  if (current) lines.push(current);
  return lines;
}

export async function buildInvoicePdf(order: OrderWithItems): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Facture ${invoiceNumber(order)}`);
  pdf.setAuthor("Le Jardin d'Eïden");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);

  const W = 595.28;
  const H = 841.89;
  const M = 48; // marge
  let page: PDFPage = pdf.addPage([W, H]);

  const text = (p: PDFPage, s: string, x: number, y: number, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}) =>
    p.drawText(pdfText(s), { x, y, size: opts.size ?? 10, font: opts.font ?? regular, color: opts.color ?? C.ink });
  const right = (p: PDFPage, s: string, xRight: number, y: number, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}) => {
    const f = opts.font ?? regular;
    const w = f.widthOfTextAtSize(pdfText(s), opts.size ?? 10);
    text(p, s, xRight - w, y, opts);
  };

  // ── En-tête ──
  page.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: C.forest });
  text(page, "Le Jardin d'Eïden", M, H - 58, { size: 24, font: serif, color: C.ivory });
  text(page, "Beauté & soins · Livraison au Cameroun", M, H - 78, { size: 10, color: C.ivory });
  right(page, "FACTURE", W - M, H - 56, { size: 22, font: bold, color: C.brass });
  right(page, invoiceNumber(order), W - M, H - 76, { size: 10, color: C.ivory });

  // ── Infos facture / vendeur / client ──
  let y = H - 150;
  const paidAt = order.paidAt ?? order.updatedAt;
  const info: [string, string][] = [
    ["Date de facture", formatDate(paidAt)],
    ["Commande", order.reference],
    ["Date de commande", formatDate(order.createdAt)],
    ["Moyen de paiement", paymentLabel(order)],
  ];
  for (const [k, v] of info) {
    text(page, k, M, y, { size: 9, color: C.muted });
    text(page, v, M + 110, y, { size: 10 });
    y -= 16;
  }

  const shop = [
    "Le Jardin d'Eïden",
    process.env.SHOP_ADDRESS || "Cameroun",
    process.env.EMAIL_FROM || "",
    process.env.WHATSAPP_BUSINESS_NUMBER ? `WhatsApp : +${process.env.WHATSAPP_BUSINESS_NUMBER}` : "",
  ].filter(Boolean);
  const client = [
    order.customerName,
    order.customerEmail ?? "",
    `Tél. : +${order.customerPhone}`,
    ...wrap(`${order.deliveryAddress}, ${order.deliveryCity}`, regular, 10, 200),
  ].filter(Boolean);

  y -= 14;
  const colB = W / 2 + 10;
  text(page, "VENDEUR", M, y, { size: 8, font: bold, color: C.foliage });
  text(page, "FACTURÉ ET LIVRÉ À", colB, y, { size: 8, font: bold, color: C.foliage });
  y -= 15;
  const blockTop = y;
  shop.forEach((l, i) => text(page, l, M, blockTop - i * 14, { size: 10, font: i === 0 ? bold : regular }));
  client.forEach((l, i) => text(page, l, colB, blockTop - i * 14, { size: 10, font: i === 0 ? bold : regular }));
  y = blockTop - Math.max(shop.length, client.length) * 14 - 22;

  // ── Tableau des articles ── (x = bord droit des colonnes chiffrées)
  const cols = { name: M + 10, qty: 330, unit: 435, total: W - M - 10 };
  const nameWidth = cols.qty - 40 - cols.name;
  const header = (p: PDFPage, yy: number) => {
    p.drawRectangle({ x: M, y: yy - 9, width: W - 2 * M, height: 27, color: C.ivory });
    text(p, "Désignation", cols.name, yy, { size: 9, font: bold });
    right(p, "Qté", cols.qty, yy, { size: 9, font: bold });
    right(p, "Prix unitaire", cols.unit, yy, { size: 9, font: bold });
    right(p, "Total", cols.total, yy, { size: 9, font: bold });
  };
  header(page, y);
  y -= 32;

  for (const it of order.items) {
    const lines = wrap(it.productName, regular, 10, nameWidth);
    const height = (lines.length - 1) * 13;
    if (y - height < 200) {
      // Nouvelle page si le tableau déborde
      page = pdf.addPage([W, H]);
      y = H - M - 10;
      header(page, y);
      y -= 32;
    }
    lines.forEach((l, i) => text(page, l, cols.name, y - i * 13, { size: 10 }));
    right(page, String(it.quantity), cols.qty, y, { size: 10 });
    right(page, formatPrice(it.unitPrice), cols.unit, y, { size: 10 });
    right(page, formatPrice(it.lineTotal), cols.total, y, { size: 10, font: bold });
    // Filet sous la ligne, sous les jambages du texte
    const sep = y - height - 9;
    page.drawLine({ start: { x: M, y: sep }, end: { x: W - M, y: sep }, thickness: 0.6, color: C.line });
    y = sep - 17;
  }

  // ── Totaux ──
  y -= 6;
  const tx = 300; // début du bloc des totaux
  const lines: [string, string][] = [
    ["Sous-total", formatPrice(order.subtotal)],
    ["Livraison", order.deliveryFee ? formatPrice(order.deliveryFee) : "Confirmée sur WhatsApp"],
  ];
  for (const [k, v] of lines) {
    text(page, k, tx + 12, y, { size: 10, color: C.muted });
    right(page, v, cols.total, y, { size: 10 });
    y -= 20;
  }
  y -= 8;
  page.drawRectangle({ x: tx, y: y - 10, width: W - M - tx, height: 30, color: C.forest });
  text(page, "TOTAL PAYÉ", tx + 12, y, { size: 11, font: bold, color: C.ivory });
  right(page, formatPrice(order.total), cols.total, y, { size: 12, font: bold, color: C.ivory });

  // ── Tampon « Payée », sous les totaux ──
  y -= 74;
  page.drawRectangle({ x: M, y, width: 240, height: 46, borderColor: C.success, borderWidth: 1.5, color: rgb(0.906, 0.937, 0.906) });
  text(page, "PAYÉE", M + 14, y + 26, { size: 14, font: bold, color: C.success });
  text(page, `le ${formatDate(paidAt)} · ${paymentLabel(order)}`, M + 14, y + 10, { size: 9, color: C.success });

  // ── Pied de page ──
  const last = pdf.getPages().at(-1)!;
  last.drawLine({ start: { x: M, y: 70 }, end: { x: W - M, y: 70 }, thickness: 0.6, color: C.line });
  text(last, "Merci pour ta confiance ! Ta commande est en préparation et sera livrée dans les plus brefs délais.", M, 54, {
    size: 9,
    color: C.muted,
  });
  text(last, "Le Jardin d'Eïden — boutique en ligne de produits de beauté et de soin.", M, 40, { size: 8, color: C.muted });

  return pdf.save();
}
