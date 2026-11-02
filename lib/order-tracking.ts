// Suivi de commande côté client : étapes de livraison, du début à la fin
import type { Order, OrderEventType, OrderItem } from "./db/schema";
import { paymentLabel } from "./invoice";

export type StepState = "done" | "current" | "upcoming";

export type TrackingView = {
  id: string;
  reference: string;
  total: number;
  createdAt: string;
  deliveryCity: string;
  deliveryAddress: string;
  cancelled: boolean;
  refunded: boolean;
  /** 0 à 100 : avancement global (barre de progression) */
  progress: number;
  steps: { key: OrderEventType; label: string; description: string; icon: string; date: string | null; state: StepState }[];
  items: { name: string; quantity: number; lineTotal: number }[];
};

type OrderWithEvents = Order & { items: OrderItem[]; events: { type: OrderEventType; createdAt: Date }[] };

export function buildTracking(order: OrderWithEvents): TrackingView {
  const paid = order.payment === "REUSSI";
  const cancelled = order.status === "ANNULEE";
  const s = order.status;
  // Date la plus récente de chaque étape
  const dateOf = (type: OrderEventType) =>
    order.events.filter((e) => e.type === type).sort((a, b) => +b.createdAt - +a.createdAt)[0]?.createdAt ?? null;

  const base: Omit<TrackingView["steps"][number], "state">[] = [
    {
      key: "CREEE",
      label: "Commande passée",
      description: "Nous avons bien reçu ta commande.",
      icon: "🧾",
      date: (dateOf("CREEE") ?? order.createdAt).toISOString(),
    },
    {
      key: "PAYEE",
      label: "Paiement confirmé",
      description: paid ? `Paiement reçu (${paymentLabel(order)}). Ta facture t'a été envoyée par email.` : "Notre équipe valide ta commande et confirme ton paiement.",
      icon: "💳",
      date: (dateOf("PAYEE") ?? order.paidAt)?.toISOString() ?? null,
    },
    {
      key: "EN_PREPARATION",
      label: "En préparation",
      description: "Nous préparons ton colis avec soin.",
      icon: "📦",
      date: dateOf("EN_PREPARATION")?.toISOString() ?? null,
    },
    {
      key: "EXPEDIEE",
      label: "Expédiée",
      description: `Ton colis est en route vers ${order.deliveryCity}. Le livreur t'appellera à l'arrivée.`,
      icon: "🚚",
      date: dateOf("EXPEDIEE")?.toISOString() ?? null,
    },
    {
      key: "LIVREE",
      label: "Livrée",
      description: "Colis remis. Merci pour ta confiance !",
      icon: "🌿",
      date: dateOf("LIVREE")?.toISOString() ?? null,
    },
  ];

  const done: Record<string, boolean> = {
    CREEE: true,
    PAYEE: paid,
    EN_PREPARATION: ["EN_PREPARATION", "EXPEDIEE", "LIVREE"].includes(s),
    EXPEDIEE: ["EXPEDIEE", "LIVREE"].includes(s),
    LIVREE: s === "LIVREE",
  };
  const currentIndex = cancelled ? -1 : base.findIndex((b) => !done[b.key]);
  const steps = base.map((b, i) => ({
    ...b,
    state: (done[b.key] ? "done" : i === currentIndex ? "current" : "upcoming") as StepState,
  }));
  const doneCount = steps.filter((st) => st.state === "done").length;

  return {
    id: order.id,
    reference: order.reference,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    deliveryCity: order.deliveryCity,
    deliveryAddress: order.deliveryAddress,
    cancelled,
    refunded: order.payment === "REMBOURSE",
    progress: Math.round(((doneCount - 1) / (steps.length - 1)) * 100),
    steps,
    items: order.items.map((it) => ({ name: it.productName, quantity: it.quantity, lineTotal: it.lineTotal })),
  };
}
