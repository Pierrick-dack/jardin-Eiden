// Notifications in-app (cloche) : pour l'équipe admin ou pour un client
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { notifications } from "./db/schema";

export type NotificationView = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string; // ISO
};

type Target = { audience: "ADMIN" } | { audience: "CLIENT"; customerId: string };

const scope = (t: Target) =>
  t.audience === "ADMIN"
    ? eq(notifications.audience, "ADMIN")
    : and(eq(notifications.audience, "CLIENT"), eq(notifications.customerId, t.customerId));

export async function notify(target: Target, n: { title: string; body?: string; href?: string }) {
  try {
    await db.insert(notifications).values({
      audience: target.audience,
      customerId: target.audience === "CLIENT" ? target.customerId : null,
      title: n.title,
      body: n.body ?? "",
      href: n.href ?? null,
    });
  } catch (e) {
    // Une notification ratée ne doit jamais bloquer une commande
    console.error("[notification]", e);
  }
}

export async function listNotifications(target: Target, limit = 20): Promise<{ items: NotificationView[]; unread: number }> {
  const [rows, [unread]] = await Promise.all([
    db.select().from(notifications).where(scope(target)).orderBy(desc(notifications.createdAt)).limit(limit),
    db.select({ n: count() }).from(notifications).where(and(scope(target), isNull(notifications.readAt))),
  ]);
  return {
    unread: unread.n,
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      href: r.href,
      read: !!r.readAt,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function countUnread(target: Target) {
  const [r] = await db.select({ n: count() }).from(notifications).where(and(scope(target), isNull(notifications.readAt)));
  return r.n;
}

/** Vide la liste : supprime toutes les notifications de la cible */
export async function clearNotifications(target: Target) {
  await db.delete(notifications).where(scope(target));
}

/** Marque lues toutes les notifications (ou une seule) de la cible */
export async function markRead(target: Target, id?: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(scope(target), isNull(notifications.readAt), id ? eq(notifications.id, id) : undefined));
}
