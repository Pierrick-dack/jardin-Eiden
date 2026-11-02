import type { ReactNode } from "react";

/** En-tête d'une page admin : titre, sous-titre et actions à droite */
export function AdminPage({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 1.9rem)", color: "var(--forest)" }}>{title}</h1>
          {subtitle && <p style={{ margin: "0.3rem 0 0", color: "var(--muted)", fontSize: "0.92rem" }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>{actions}</div>}
      </div>
      {children}
    </>
  );
}

/** Tableau admin : conteneur blanc défilant horizontalement sur mobile */
export function AdminTable({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "0.8rem", background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
        <thead>
          <tr style={{ textAlign: "left", background: "var(--ivory-deep)" }}>
            {head.map((h) => (
              <th key={h} style={{ padding: "0.75rem 1rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <p style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", margin: 0 }}>{empty}</p>}
    </div>
  );
}

export const adminTd: React.CSSProperties = { padding: "0.7rem 1rem", verticalAlign: "middle", borderTop: "1px solid var(--line)" };
