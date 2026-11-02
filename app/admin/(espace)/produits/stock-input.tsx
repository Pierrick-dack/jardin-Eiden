"use client";

import { useState, useTransition } from "react";
import { updateStock } from "./actions";

/** Champ de stock modifiable directement dans la liste des produits */
export function StockInput({ id, stock }: { id: string; stock: number }) {
  const [value, setValue] = useState(String(stock));
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = Number(value) !== stock;
  const tone = stock === 0 ? "var(--danger)" : stock <= 5 ? "var(--earth)" : "var(--ink)";

  function save() {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) return setValue(String(stock));
    start(async () => {
      await updateStock(id, n);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
    >
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Stock"
        className="field"
        style={{ width: 76, padding: "0.35rem 0.5rem", color: tone, fontWeight: stock <= 5 ? 700 : 400 }}
      />
      {dirty && (
        <button type="submit" disabled={pending} className="btn btn-primary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.78rem" }}>
          {pending ? "…" : "OK"}
        </button>
      )}
      {saved && <span style={{ color: "var(--success)", fontSize: "0.8rem" }}>✓</span>}
    </form>
  );
}
