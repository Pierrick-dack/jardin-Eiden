import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getFinance, parsePeriod } from "@/lib/finance";
import { invoiceNumber, paymentLabel } from "@/lib/invoice";

// Export CSV des encaissements (ouvrable dans Excel / Google Sheets)
export async function GET(request: Request) {
  if (!(await getCurrentAdmin())) return NextResponse.redirect(new URL("/admin/login", request.url));
  const period = parsePeriod(new URL(request.url).searchParams.get("periode") ?? undefined);
  const f = await getFinance(period);

  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    ["Date d'encaissement", "Facture", "Commande", "Client", "Téléphone", "Email", "Moyen", "Référence paiement", "Montant (FCFA)"],
    ...f.paid.map((o) => [
      o.paidAt ? o.paidAt.toISOString().slice(0, 10) : "",
      invoiceNumber(o),
      o.reference,
      o.customerName,
      `+${o.customerPhone}`,
      o.customerEmail ?? "",
      paymentLabel(o),
      o.paymentRef ?? "",
      o.total,
    ]),
  ];
  // BOM UTF-8 + « ; » : Excel en français ouvre le fichier correctement
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="encaissements-${period}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
