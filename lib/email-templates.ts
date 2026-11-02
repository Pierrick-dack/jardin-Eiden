// Modèles d'emails (HTML à styles en ligne, compatible avec les messageries).
import type { Email } from "./email";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Gabarit commun : en-tête vert, carte blanche, pied de page */
function layout(title: string, body: string) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;background:#fbf7ef;font-family:Arial,Helvetica,sans-serif;color:#20201c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf7ef;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="background:#1e3a2b;border-radius:14px 14px 0 0;padding:22px 28px;color:#fbf7ef;font-family:Georgia,serif;font-size:22px">
          Le Jardin d'Eïden
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e4ddcd;border-top:none;border-radius:0 0 14px 14px;padding:28px">
          ${body}
        </td></tr>
        <tr><td style="padding:18px 8px;text-align:center;font-size:12px;color:#6a6a60">
          Le Jardin d'Eïden · Beauté &amp; soins · Livraison au Cameroun<br>
          <a href="${siteUrl()}" style="color:#2d5c42">${siteUrl().replace(/^https?:\/\//, "")}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:#1e3a2b;border-radius:999px">
  <a href="${href}" style="display:inline-block;padding:13px 28px;color:#fbf7ef;text-decoration:none;font-weight:bold;font-size:15px">${escape(label)}</a>
</td></tr></table>`;
}

type OrderForEmail = {
  reference: string;
  customerName: string;
  customerEmail: string;
  deliveryCity: string;
  deliveryAddress: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: Date;
  items: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
};

const money = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const longDate = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Douala" }).format(d);

/**
 * Email de commande :
 * - "paid" : paiement confirmé, facture PDF jointe, livraison au plus vite
 * - "received" : commande reçue (mode sans paiement en ligne), suite sur WhatsApp
 */
export function orderEmailTemplate(
  order: OrderForEmail,
  kind: "paid" | "received",
  links: { account: string; tracking: string; paymentLabel?: string; invoiceName?: string }
): Email {
  const firstName = order.customerName.split(" ")[0];
  const paid = kind === "paid";
  const subject = paid
    ? `Paiement confirmé — commande ${order.reference}`
    : `Commande ${order.reference} bien reçue`;

  const rows = order.items
    .map(
      (it) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #e4ddcd">${escape(it.productName)}<br><span style="color:#6a6a60;font-size:12px">${it.quantity} × ${money(it.unitPrice)}</span></td>
        <td style="padding:10px 0;border-bottom:1px solid #e4ddcd;text-align:right;white-space:nowrap;font-weight:bold">${money(it.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const html = layout(
    subject,
    `${
      paid
        ? `<p style="display:inline-block;margin:0 0 14px;padding:6px 12px;border-radius:999px;background:#e7efe7;color:#2d6a4a;font-weight:bold;font-size:13px">✓ Paiement confirmé</p>`
        : ""
    }
     <h1 style="font-family:Georgia,serif;font-weight:normal;color:#1e3a2b;font-size:24px;margin:0 0 12px">Merci ${escape(firstName)} !</h1>
     <p style="line-height:1.6;margin:0 0 6px">${
       paid
         ? `Nous avons bien reçu ton paiement de <strong>${money(order.total)}</strong>${links.paymentLabel ? ` par ${escape(links.paymentLabel)}` : ""}. Ta commande est en préparation et <strong>sera livrée dans les plus brefs délais</strong>.`
         : `Ta commande a bien été enregistrée. Nous te contactons très vite sur WhatsApp pour confirmer le paiement et organiser la livraison.`
     }</p>
     ${paid && links.invoiceName ? `<p style="line-height:1.6;margin:0;color:#6a6a60;font-size:14px">📎 Ta facture est jointe à cet email (${escape(links.invoiceName)}).</p>` : ""}

     <h2 style="font-family:Georgia,serif;font-weight:normal;color:#1e3a2b;font-size:18px;margin:26px 0 4px">Récapitulatif de ta commande</h2>
     <p style="margin:0 0 8px;color:#6a6a60;font-size:13px">Commande <strong style="color:#20201c">${escape(order.reference)}</strong> du ${longDate(order.createdAt)}</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
       ${rows}
       <tr><td style="padding:10px 0 2px;color:#6a6a60">Sous-total</td><td style="padding:10px 0 2px;text-align:right">${money(order.subtotal)}</td></tr>
       <tr><td style="padding:2px 0;color:#6a6a60">Livraison</td><td style="padding:2px 0;text-align:right">${order.deliveryFee ? money(order.deliveryFee) : "Confirmée sur WhatsApp"}</td></tr>
       <tr><td style="padding:10px 0 0;font-size:16px;font-weight:bold;color:#1e3a2b">${paid ? "Total payé" : "Total"}</td><td style="padding:10px 0 0;text-align:right;font-size:16px;font-weight:bold;color:#1e3a2b">${money(order.total)}</td></tr>
     </table>

     <h2 style="font-family:Georgia,serif;font-weight:normal;color:#1e3a2b;font-size:18px;margin:26px 0 6px">Livraison</h2>
     <p style="line-height:1.6;margin:0">${escape(order.customerName)}<br>${escape(order.deliveryAddress)}, ${escape(order.deliveryCity)}</p>

     ${button("Suivre ma commande", links.tracking)}
     <p style="line-height:1.6;font-size:13px;color:#6a6a60;margin:0">Retrouve toutes tes commandes${paid ? " et tes factures" : ""} dans <a href="${links.account}" style="color:#2d5c42">ton compte</a>.</p>`
  );

  const text = [
    `Merci ${firstName} !`,
    "",
    paid
      ? `Paiement confirmé : ${money(order.total)}${links.paymentLabel ? ` (${links.paymentLabel})` : ""}. Ta commande ${order.reference} est en préparation et sera livrée dans les plus brefs délais.`
      : `Ta commande ${order.reference} a bien été enregistrée. Nous te contactons sur WhatsApp pour le paiement et la livraison.`,
    paid && links.invoiceName ? `Ta facture est jointe à cet email (${links.invoiceName}).` : "",
    "",
    "Récapitulatif :",
    ...order.items.map((it) => `- ${it.quantity} × ${it.productName} : ${money(it.lineTotal)}`),
    `Total${paid ? " payé" : ""} : ${money(order.total)}`,
    "",
    `Livraison : ${order.deliveryAddress}, ${order.deliveryCity}`,
    "",
    `Suivre ma commande : ${links.tracking}`,
    `Mon compte : ${links.account}`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

  return { to: { email: order.customerEmail, name: order.customerName }, subject, html, text };
}

/** Changement d'étape de livraison (expédiée, livrée) ou annulation */
export function orderStatusEmailTemplate(
  order: { reference: string; customerName: string; customerEmail: string; deliveryCity: string; deliveryAddress: string; total: number },
  type: "EXPEDIEE" | "LIVREE" | "ANNULEE",
  links: { tracking: string; refunded?: boolean }
): Email {
  const firstName = order.customerName.split(" ")[0];
  const content = {
    EXPEDIEE: {
      subject: `Ta commande ${order.reference} est en route 🚚`,
      title: "Ta commande est en route !",
      text: `Bonne nouvelle ${firstName} : ta commande <strong>${escape(order.reference)}</strong> vient d'être expédiée. Notre livreur te contactera au moment de la livraison à ${escape(order.deliveryAddress)}, ${escape(order.deliveryCity)}.`,
      plain: `Ta commande ${order.reference} vient d'être expédiée. Notre livreur te contactera au moment de la livraison à ${order.deliveryAddress}, ${order.deliveryCity}.`,
    },
    LIVREE: {
      subject: `Ta commande ${order.reference} a été livrée 🌿`,
      title: "Ta commande est livrée !",
      text: `${escape(firstName)}, ta commande <strong>${escape(order.reference)}</strong> a bien été livrée. Merci pour ta confiance ! N'hésite pas à laisser un avis sur les produits reçus : il aide les autres clients.`,
      plain: `Ta commande ${order.reference} a bien été livrée. Merci pour ta confiance ! N'hésite pas à laisser un avis sur les produits reçus.`,
    },
    ANNULEE: {
      subject: `Ta commande ${order.reference} a été annulée`,
      title: "Commande annulée",
      text: `${escape(firstName)}, ta commande <strong>${escape(order.reference)}</strong> a été annulée.${
        links.refunded ? ` Le montant de <strong>${money(order.total)}</strong> te sera remboursé.` : ""
      } Pour toute question, réponds simplement à cet email.`,
      plain: `Ta commande ${order.reference} a été annulée.${links.refunded ? ` Le montant de ${money(order.total)} te sera remboursé.` : ""}`,
    },
  }[type];

  const steps = ["Commande passée", "Paiement confirmé", "En préparation", "Expédiée", "Livrée"];
  const reached = type === "LIVREE" ? 5 : type === "EXPEDIEE" ? 4 : 0;
  const progress =
    type === "ANNULEE"
      ? ""
      : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;font-size:12px">
          <tr>${steps
            .map(
              (s, i) => `<td align="center" style="padding:0 2px;color:${i < reached ? "#1e3a2b" : "#6a6a60"}">
                <div style="width:22px;height:22px;line-height:22px;border-radius:999px;margin:0 auto 6px;font-weight:bold;
                  background:${i < reached ? "#2f7d4f" : "#e4ddcd"};color:#fff">${i < reached ? "✓" : i + 1}</div>${s}</td>`
            )
            .join("")}</tr>
        </table>`;

  const html = layout(
    content.subject,
    `<h1 style="font-family:Georgia,serif;font-weight:normal;color:#1e3a2b;font-size:24px;margin:0 0 12px">${content.title}</h1>
     <p style="line-height:1.6;margin:0">${content.text}</p>
     ${progress}
     ${button("Suivre ma commande", links.tracking)}`
  );
  const text = `Bonjour ${firstName},\n\n${content.plain}\n\nSuivre ma commande : ${links.tracking}`;
  return { to: { email: order.customerEmail, name: order.customerName }, subject: content.subject, html, text };
}

/** Confirmation de l'adresse email à l'inscription */
export function verifyEmailTemplate(to: { email: string; firstName: string }, url: string, minutes: number): Email {
  const subject = "Confirme ton adresse email";
  const html = layout(
    subject,
    `<h1 style="font-family:Georgia,serif;font-weight:normal;color:#1e3a2b;font-size:24px;margin:0 0 12px">Bienvenue ${escape(to.firstName)} !</h1>
     <p style="line-height:1.6;margin:0 0 8px">Merci d'avoir créé ton compte. Pour l'activer, confirme ton adresse email :</p>
     ${button("Confirmer mon adresse email", url)}
     <p style="line-height:1.6;font-size:13px;color:#6a6a60;margin:0">Ce lien est valable ${minutes} minutes. Si le bouton ne fonctionne pas, copie cette adresse dans ton navigateur :<br>
     <a href="${url}" style="color:#2d5c42;word-break:break-all">${url}</a></p>
     <p style="line-height:1.6;font-size:13px;color:#6a6a60;margin:16px 0 0">Tu n'es pas à l'origine de cette inscription ? Ignore simplement cet email.</p>`
  );
  const text = `Bienvenue ${to.firstName} !\n\nConfirme ton adresse email pour activer ton compte Le Jardin d'Eïden :\n${url}\n\nCe lien est valable ${minutes} minutes.`;
  return { to: { email: to.email, name: to.firstName }, subject, html, text };
}
