// Squelette affiché pendant le chargement d'une page admin (données lues à
// la requête) : le menu reste visible et la navigation est immédiate.
export function AdminSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement…" style={{ display: "grid", gap: "1rem" }}>
      <div className="admin-skel" style={{ height: 34, width: "min(320px, 60%)" }} />
      <div className="admin-skel" style={{ height: 18, width: "min(480px, 80%)" }} />
      <div className="admin-skel" style={{ height: 320, borderRadius: "1rem" }} />
      <style>{`
        .admin-skel { border-radius: 0.6rem; background: linear-gradient(90deg, var(--ivory-deep) 25%, #fff 50%, var(--ivory-deep) 75%); background-size: 200% 100%; animation: admin-skel 1.2s ease-in-out infinite; }
        @keyframes admin-skel { from { background-position: 200% 0; } to { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}
