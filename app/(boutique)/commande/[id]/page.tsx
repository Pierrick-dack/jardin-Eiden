import { Suspense } from "react";
import { OrderStatusClient } from "./status-client";

export const metadata = {
  title: "Suivi de commande",
  robots: { index: false },
};

export default function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="wrap" style={{ padding: "4rem 1.25rem", textAlign: "center" }}>
          <p style={{ color: "var(--muted)" }}>Chargement de ta commande...</p>
        </div>
      }
    >
      <Resolver params={params} />
    </Suspense>
  );
}

async function Resolver({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderStatusClient orderId={id} />;
}
