"use client";

import { HeaderMenu } from "./header-menu";

/** Langue et devise. Le site est en français ; l'anglais est annoncé mais pas encore traduit. */
export function LanguageMenu() {
  return (
    <HeaderMenu
      label="Langue et devise : français, FCFA"
      width={300}
      trigger={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: "0.88rem" }}>
          <span aria-hidden style={{ fontSize: "1.05rem" }}>
            🇨🇲
          </span>
          FR
        </span>
      }
    >
      <div style={{ padding: "1rem 1.2rem" }}>
        <p className="lm-title">Langue</p>
        <ul className="lm-list">
          <li>
            <span className="lm-opt is-active">
              <span className="lm-radio" aria-hidden /> Français <small>FR</small>
            </span>
          </li>
          <li>
            <span className="lm-opt is-disabled" aria-disabled>
              <span className="lm-radio" aria-hidden /> English <small>Bientôt disponible</small>
            </span>
          </li>
        </ul>
        <div style={{ height: 1, background: "var(--line)", margin: "0.85rem 0" }} />
        <p className="lm-title">Devise</p>
        <p style={{ margin: 0, fontSize: "0.88rem" }}>
          <strong>FCFA</strong> — Franc CFA (XAF)
        </p>
        <p style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>🚚 Livraison partout au Cameroun</p>
      </div>
      <style>{`
        .lm-title { margin: 0 0 0.5rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
        .lm-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
        .lm-opt { display: flex; align-items: center; gap: 0.55rem; font-size: 0.9rem; }
        .lm-opt small { color: var(--muted); font-size: 0.75rem; margin-left: auto; }
        .lm-radio { width: 16px; height: 16px; border-radius: 999px; border: 2px solid var(--muted); flex-shrink: 0; }
        .lm-opt.is-active { font-weight: 600; color: var(--forest); }
        .lm-opt.is-active .lm-radio { border-color: var(--forest); background: radial-gradient(var(--forest) 0 40%, #fff 45%); }
        .lm-opt.is-disabled { color: var(--muted); }
      `}</style>
    </HeaderMenu>
  );
}
