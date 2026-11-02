// Histogramme simple (une série) en HTML/CSS, sans bibliothèque.
// Barres ≤ 24px, bout arrondi 4px, base carrée, 2px d'espace entre barres,
// info-bulle au survol/focus, seule la valeur maximale est étiquetée,
// et un tableau des données pour l'accessibilité.
export type BarDatum = { label: string; value: number; tip: string };

// Vert de la charte, validé (luminosité, saturation, contraste) pour les marques
const BAR = "#2f7d4f";

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".", ",")} M` : n >= 1000 ? `${Math.round(n / 1000)} k` : String(n);

export function BarChart({ data, height = 180, valueLabel }: { data: BarDatum[]; height?: number; valueLabel: string }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const maxIndex = data.findIndex((d) => d.value === max && max > 0);
  // Étiquettes d'axe clairsemées : début, milieu, fin
  const ticks = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);

  return (
    <figure style={{ margin: 0 }}>
      <div className="bc" style={{ height }}>
        <div className="bc-axis" aria-hidden>
          <span>{compact(max)}</span>
          <span>0</span>
        </div>
        <div className="bc-plot" role="list" aria-label={valueLabel}>
          {data.map((d, i) => (
            <div key={d.label + i} className="bc-slot" role="listitem">
              <div
                className="bc-bar"
                tabIndex={0}
                aria-label={d.tip}
                data-tip={d.tip}
                style={{ height: max ? `${Math.max((d.value / max) * 100, d.value ? 2 : 0)}%` : 0 }}
              >
                {i === maxIndex && <span className="bc-peak">{compact(d.value)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bc-x" aria-hidden>
        {data.map((d, i) => (
          <span key={d.label + i}>{ticks.has(i) ? d.label : ""}</span>
        ))}
      </div>
      <details style={{ marginTop: "0.6rem", fontSize: "0.82rem" }}>
        <summary style={{ cursor: "pointer", color: "var(--muted)" }}>Voir les données en tableau</summary>
        <table style={{ marginTop: "0.5rem", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.label + i}>
                <td style={{ padding: "0.15rem 1rem 0.15rem 0", color: "var(--muted)" }}>{d.label}</td>
                <td style={{ padding: "0.15rem 0", textAlign: "right" }}>{d.tip.split(" : ").pop()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <style>{`
        .bc { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.5rem; }
        .bc-axis { display: flex; flex-direction: column; justify-content: space-between; font-size: 0.72rem; color: var(--muted); text-align: right; padding-bottom: 0; }
        .bc-plot { display: flex; align-items: flex-end; gap: 2px; border-bottom: 1px solid var(--line); position: relative; }
        .bc-slot { flex: 1 1 0; height: 100%; display: flex; align-items: flex-end; justify-content: center; min-width: 0; }
        .bc-bar {
          position: relative; width: 100%; max-width: 24px;
          background: ${BAR}; border-radius: 4px 4px 0 0;
          outline: none; cursor: default;
        }
        .bc-bar:hover, .bc-bar:focus-visible { filter: brightness(1.15); }
        .bc-bar:focus-visible { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--brass); }
        .bc-bar::after {
          content: attr(data-tip); position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
          white-space: nowrap; background: var(--ink); color: #fff; font-size: 0.75rem;
          padding: 0.35rem 0.55rem; border-radius: 6px; pointer-events: none;
          opacity: 0; transition: opacity 0.12s ease; z-index: 2;
        }
        .bc-bar:hover::after, .bc-bar:focus-visible::after { opacity: 1; }
        .bc-peak { position: absolute; bottom: calc(100% + 3px); left: 50%; transform: translateX(-50%); font-size: 0.7rem; color: var(--ink); font-weight: 600; white-space: nowrap; }
        .bc-bar:hover .bc-peak, .bc-bar:focus-visible .bc-peak { visibility: hidden; }
        .bc-x { display: flex; gap: 2px; margin-left: 2.4rem; font-size: 0.72rem; color: var(--muted); }
        .bc-x span { flex: 1 1 0; text-align: center; white-space: nowrap; min-width: 0; overflow: visible; }
        .bc-x span:first-child { text-align: left; }
        .bc-x span:last-child { text-align: right; }
      `}</style>
    </figure>
  );
}
