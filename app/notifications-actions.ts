"use server";

// Notifications de la cloche : le destinataire est toujours déduit de la
// session (client ou admin), jamais d'un identifiant envoyé par le navigateur.
// Une erreur de base (connexion coupée…) ne doit jamais remonter jusqu'au
// navigateur : la cloche affiche simplement l'état précédent.
import { getCurrentAdmin } from "@/lib/auth";
import { getSessionCustomer } from "@/lib/customer-auth";
import { clearNotifications, countUnread, listNotifications, markRead, type NotificationView } from "@/lib/notifications";

type Audience = "ADMIN" | "CLIENT";

async function target(audience: Audience) {
  if (audience === "ADMIN") return (await getCurrentAdmin()) ? ({ audience: "ADMIN" } as const) : null;
  const customer = await getSessionCustomer();
  return customer ? ({ audience: "CLIENT", customerId: customer.id } as const) : null;
}

async function safely<T>(label: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    console.error(`[notifications] ${label} :`, e instanceof Error ? (e.cause ?? e.message) : e);
    return fallback;
  }
}

export async function fetchNotifications(audience: Audience): Promise<{ items: NotificationView[]; unread: number } | null> {
  return safely("liste", null, async () => {
    const t = await target(audience);
    return t ? listNotifications(t) : { items: [], unread: 0 };
  });
}

export async function fetchUnreadCount(audience: Audience): Promise<number | null> {
  return safely("compteur", null, async () => {
    const t = await target(audience);
    return t ? countUnread(t) : 0;
  });
}

export async function clearAllNotifications(audience: Audience) {
  await safely("vidage", undefined, async () => {
    const t = await target(audience);
    if (t) await clearNotifications(t);
  });
}

export async function markNotificationsRead(audience: Audience, id?: string) {
  await safely("lecture", undefined, async () => {
    const t = await target(audience);
    if (t) await markRead(t, id);
  });
}
