import { NextResponse } from "next/server";
import { getSessionCustomer } from "@/lib/customer-auth";
import { invoiceResponse } from "@/lib/invoice-response";

// Téléchargement de la facture PDF d'une commande du client connecté
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getSessionCustomer();
  if (!customer) {
    return NextResponse.redirect(new URL(`/connexion?next=${encodeURIComponent("/compte")}`, request.url));
  }
  return invoiceResponse(id, customer.id);
}
