import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { invoiceResponse } from "@/lib/invoice-response";

// Facture PDF de n'importe quelle commande, pour l'admin
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.redirect(new URL("/admin/login", request.url));
  const { id } = await params;
  return invoiceResponse(id, null);
}
