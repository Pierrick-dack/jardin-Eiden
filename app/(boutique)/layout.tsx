import { Suspense, type ReactNode } from "react";
import { CartProvider } from "@/components/cart-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AccountLink, AccountLinkFallback } from "@/components/account-link";

// Pages clients (boutique, compte, commande…) : en-tête, panier et pied de page.
// Le groupe (boutique) n'apparaît pas dans les adresses.
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <SiteHeader
        account={
          <Suspense fallback={<AccountLinkFallback />}>
            <AccountLink />
          </Suspense>
        }
      />
      <main>{children}</main>
      <SiteFooter />
    </CartProvider>
  );
}
