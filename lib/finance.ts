// Chiffres financiers de la boutique (admin) : encaissements, en attente, remboursements
import { and, desc, eq, gte, ne } from "drizzle-orm";
import { db } from "./db";
import { orders } from "./db/schema";
import { paymentLabel } from "./invoice";
import { formatPrice } from "./utils";

export const PERIODS = {
  "7j": { label: "7 jours", days: 7 },
  "30j": { label: "30 jours", days: 30 },
  "90j": { label: "90 jours", days: 90 },
  "12m": { label: "12 mois", days: 365 },
  tout: { label: "Tout", days: null },
} as const;
export type Period = keyof typeof PERIODS;

export const parsePeriod = (v?: string): Period => (v && Object.hasOwn(PERIODS, v) ? (v as Period) : "30j");

const TZ = "Africa/Douala";
const dayKey = (d: Date) => new Intl.DateTimeFormat("fr-CA", { timeZone: TZ }).format(d); // AAAA-MM-JJ
const monthKey = (d: Date) => dayKey(d).slice(0, 7);
const dayLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: TZ });
const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: TZ });

export async function getFinance(period: Period) {
  const days = PERIODS[period].days;
  const since = days ? new Date(Date.now() - days * 86_400_000) : null;

  const [paid, open, refunded] = await Promise.all([
    db.query.orders.findMany({
      where: and(eq(orders.payment, "REUSSI"), since ? gte(orders.paidAt, since) : undefined),
      orderBy: desc(orders.paidAt),
    }),
    // À encaisser : commandes non payées et non annulées (toutes périodes)
    db.query.orders.findMany({
      where: and(ne(orders.payment, "REUSSI"), ne(orders.status, "ANNULEE")),
      orderBy: desc(orders.createdAt),
    }),
    db.query.orders.findMany({
      where: and(eq(orders.payment, "REMBOURSE"), since ? gte(orders.updatedAt, since) : undefined),
    }),
  ]);

  const collected = paid.reduce((s, o) => s + o.total, 0);

  // Répartition par moyen de paiement
  const methods = new Map<string, { label: string; total: number; n: number }>();
  for (const o of paid) {
    const label = paymentLabel(o);
    const m = methods.get(label) ?? { label, total: 0, n: 0 };
    m.total += o.total;
    m.n += 1;
    methods.set(label, m);
  }

  // Série : par jour (≤ 90 jours) sinon par mois ; périodes vides incluses
  const byMonth = !days || days > 90;
  const buckets = new Map<string, { label: string; value: number; n: number }>();
  const start = since ?? (paid.at(-1)?.paidAt ?? new Date());
  const cursor = new Date(start);
  const now = new Date();
  while (cursor <= now) {
    const key = byMonth ? monthKey(cursor) : dayKey(cursor);
    if (!buckets.has(key)) buckets.set(key, { label: (byMonth ? monthLabel : dayLabel).format(cursor), value: 0, n: 0 });
    if (byMonth) cursor.setMonth(cursor.getMonth() + 1, 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  for (const o of paid) {
    if (!o.paidAt) continue;
    const b = buckets.get(byMonth ? monthKey(o.paidAt) : dayKey(o.paidAt));
    if (b) {
      b.value += o.total;
      b.n += 1;
    }
  }
  const series = [...buckets.values()].map((b) => ({
    label: b.label,
    value: b.value,
    tip: `${b.label} : ${formatPrice(b.value)} (${b.n} commande${b.n > 1 ? "s" : ""})`,
  }));

  return {
    collected,
    count: paid.length,
    basket: paid.length ? Math.round(collected / paid.length) : 0,
    outstanding: open.reduce((s, o) => s + o.total, 0),
    outstandingCount: open.length,
    refunded: refunded.reduce((s, o) => s + o.total, 0),
    refundedCount: refunded.length,
    methods: [...methods.values()].sort((a, b) => b.total - a.total),
    series,
    byMonth,
    paid,
    open,
  };
}
