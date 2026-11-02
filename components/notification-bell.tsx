"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BellIcon, IconButton, TrashIcon } from "./icons";
import { clearAllNotifications, fetchNotifications, fetchUnreadCount, markNotificationsRead } from "@/app/notifications-actions";
import type { NotificationView } from "@/lib/notifications";

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
function ago(iso: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [u, n] of units) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
  return "à l'instant";
}

/** Cloche de notifications (client ou admin) avec pastille et panneau déroulant */
export function NotificationBell({
  audience,
  initialUnread,
  variant = "light",
}: {
  audience: "ADMIN" | "CLIENT";
  initialUnread: number;
  /** "dark" : sur fond vert (menu admin) */
  variant?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationView[] | null>(null);
  const [, start] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  // Nouvelles notifications : vérification toutes les 30 s (onglet visible)
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchUnreadCount(audience)
        .then((n) => n !== null && setUnread(n))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [audience]);

  // Fermeture au clic extérieur ou avec Échap
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      start(async () => {
        // null : serveur injoignable, on garde l'affichage précédent
        const res = await fetchNotifications(audience).catch(() => null);
        if (!res) return setItems((list) => list ?? []);
        setItems(res.items);
        setUnread(res.unread);
      });
    }
  }

  function markAll() {
    setUnread(0);
    setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? null);
    start(() => markNotificationsRead(audience).catch(() => {}));
  }

  function clearAll() {
    if (!confirm("Vider toutes les notifications ?")) return;
    setItems([]);
    setUnread(0);
    start(() => clearAllNotifications(audience).catch(() => {}));
  }

  function clickItem(n: NotificationView) {
    if (!n.read) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
      start(() => markNotificationsRead(audience, n.id).catch(() => {}));
    }
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`nb nb-${variant}`}>
      <button
        type="button"
        className="nb-btn"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `Notifications : ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
        title="Notifications"
      >
        <BellIcon width={20} height={20} />
        {unread > 0 && <span className="nb-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="nb-panel" role="dialog" aria-label="Notifications">
          <div className="nb-head">
            <strong>Notifications</strong>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              {unread > 0 && (
                <button type="button" className="nb-markall" onClick={markAll}>
                  Tout marquer comme lu
                </button>
              )}
              {!!items?.length && (
                <IconButton label="Vider les notifications" tone="danger" onClick={clearAll} style={{ width: 30, height: 30 }}>
                  <TrashIcon width={16} height={16} />
                </IconButton>
              )}
            </span>
          </div>
          {items === null ? (
            <p className="nb-empty">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="nb-empty">Aucune notification pour le moment.</p>
          ) : (
            <ul className="nb-list">
              {items.map((n) => {
                const body = (
                  <>
                    {!n.read && <span className="nb-dot" aria-label="Non lue" />}
                    <span style={{ minWidth: 0 }}>
                      <span className="nb-title">{n.title}</span>
                      {n.body && <span className="nb-body">{n.body}</span>}
                      <span className="nb-time">{ago(n.createdAt)}</span>
                    </span>
                  </>
                );
                return (
                  <li key={n.id} className={n.read ? "" : "is-unread"}>
                    {n.href ? (
                      <Link href={n.href} className="nb-item" onClick={() => clickItem(n)}>
                        {body}
                      </Link>
                    ) : (
                      <button type="button" className="nb-item" onClick={() => clickItem(n)}>
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <style>{`
        .nb { position: relative; }
        .nb-btn {
          position: relative; width: 40px; height: 40px; border-radius: 999px; display: grid; place-items: center;
          border: 1px solid var(--line); background: #fff; color: var(--forest); cursor: pointer;
        }
        .nb-dark .nb-btn { background: rgba(251,247,239,0.1); border-color: rgba(251,247,239,0.25); color: var(--ivory); }
        .nb-btn:hover { border-color: var(--foliage); }
        .nb-btn:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }
        .nb-badge {
          position: absolute; top: -4px; right: -4px; min-width: 19px; height: 19px; padding: 0 5px;
          border-radius: 999px; background: var(--danger); color: #fff; font-size: 0.68rem; font-weight: 700;
          display: grid; place-items: center; border: 2px solid #fff;
        }
        .nb-panel {
          position: absolute; right: 0; top: calc(100% + 10px); z-index: 60;
          width: min(360px, calc(100vw - 24px)); max-height: 70vh; overflow-y: auto;
          background: #fff; color: var(--ink); border: 1px solid var(--line); border-radius: 1rem;
          box-shadow: 0 18px 50px rgba(0,0,0,0.18); animation: nb-pop 0.16s ease;
        }
        .nb-dark .nb-panel { right: auto; left: 0; }
        .nb-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.85rem 1rem; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: #fff; }
        .nb-markall { border: none; background: none; color: var(--foliage); font: inherit; font-size: 0.8rem; cursor: pointer; text-decoration: underline; }
        .nb-empty { margin: 0; padding: 1.5rem 1rem; text-align: center; color: var(--muted); font-size: 0.9rem; }
        .nb-list { list-style: none; margin: 0; padding: 0.35rem; }
        .nb-item {
          display: flex; gap: 0.6rem; align-items: flex-start; width: 100%; text-align: left;
          padding: 0.65rem 0.7rem; border-radius: 0.7rem; border: none; background: none;
          color: inherit; text-decoration: none; font: inherit; cursor: pointer;
        }
        .nb-item:hover { background: var(--ivory-deep); }
        .is-unread .nb-item { background: #f6faf6; }
        .nb-dot { width: 8px; height: 8px; border-radius: 999px; background: #2f7d4f; margin-top: 6px; flex-shrink: 0; }
        .nb-title { display: block; font-weight: 600; font-size: 0.88rem; }
        .nb-body { display: block; font-size: 0.82rem; color: var(--muted); margin-top: 0.1rem; }
        .nb-time { display: block; font-size: 0.72rem; color: var(--muted); margin-top: 0.25rem; }
        @media (max-width: 720px) {
          .nb-light .nb-btn { width: 36px; height: 36px; }
          /* Mobile : panneau pleine largeur sous l'en-tête */
          .nb-light .nb-panel { position: fixed; left: 8px; right: 8px; top: var(--header-h, 120px); width: auto; max-height: calc(100dvh - var(--header-h, 120px) - 12px); }
        }
        @keyframes nb-pop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
