/** Squelette de grille produits pendant le chargement */
export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "1.75rem 1.25rem",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div style={{ aspectRatio: "1/1", borderRadius: "0.9rem", background: "var(--ivory-deep)" }} />
          <div
            style={{ height: 14, width: "70%", background: "var(--ivory-deep)", marginTop: 12, borderRadius: 4 }}
          />
        </div>
      ))}
    </div>
  );
}
