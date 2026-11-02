"use client";

import { useEffect, useRef, useState } from "react";
import { uploadProductPhoto } from "@/app/admin/(espace)/produits/actions";
import { IconButton, TrashIcon } from "@/components/icons";
import { resizeToSquare } from "@/lib/resize-image";
import { gradeLabel, type QualityReport } from "@/lib/image-quality";

/** Doit rester égal à PHOTO_SIZE (lib/media.ts), vérifié côté serveur */
const SIZE = 1200;
const MIN_SOURCE = 500;
const QUALITY = 0.9;

type Photo = {
  key: string;
  /** Adresse définitive (après envoi) */
  url?: string;
  /** Aperçu local pendant le traitement */
  preview?: string;
  status: "resizing" | "uploading" | "done" | "error";
  error?: string;
  /** Contrôle qualité (photos ajoutées pendant cette session) */
  report?: QualityReport;
};

const gradeColor: Record<QualityReport["grade"], string> = {
  excellente: "#2f7d4f",
  bonne: "#3f8a5c",
  moyenne: "#b7791f",
  faible: "#c0392b",
};

export function PhotoUploader({
  name,
  initial,
  onBusyChange,
}: {
  /** Champ envoyé avec le formulaire : une adresse par ligne */
  name: string;
  initial: string[];
  onBusyChange?: (busy: boolean) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>(() => initial.map((url) => ({ key: url, url, status: "done" })));
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const busy = photos.some((p) => p.status === "resizing" || p.status === "uploading");
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  // Libère les aperçus locaux
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const set = previews.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const patch = (key: string, p: Partial<Photo>) => setPhotos((list) => list.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function process(file: File, key: string) {
    try {
      const { blob, report } = await resizeToSquare(file, SIZE, { minSource: MIN_SOURCE, quality: QUALITY });
      const preview = URL.createObjectURL(blob);
      previews.current.add(preview);
      patch(key, { status: "uploading", preview, report });
      const fd = new FormData();
      fd.append("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      const res = await uploadProductPhoto(fd);
      if ("error" in res) patch(key, { status: "error", error: res.error });
      else patch(key, { status: "done", url: res.url });
    } catch (e) {
      patch(key, { status: "error", error: e instanceof Error ? e.message : "Échec du traitement." });
    }
  }

  function addFiles(files: FileList | File[]) {
    const room = 12 - photos.length;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    const added = list.map((file) => ({ file, key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}` }));
    setPhotos((cur) => [...cur, ...added.map(({ key }) => ({ key, status: "resizing" as const }))]);
    // Une photo après l'autre : le navigateur reste fluide sur les gros fichiers
    (async () => {
      for (const { file, key } of added) await process(file, key);
    })();
  }

  function move(i: number, to: number) {
    setPhotos((list) => {
      const next = [...list];
      const [item] = next.splice(i, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  const value = photos.filter((p) => p.status === "done" && p.url).map((p) => p.url).join("\n");

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="pu-grid">
        {photos.map((p, i) => (
          <figure key={p.key} className={`pu-tile${i === 0 ? " is-main" : ""}${p.status === "error" ? " is-error" : ""}`}>
            {(p.preview || p.url) && (
              // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) avant envoi
              <img src={p.preview ?? p.url} alt={`Photo ${i + 1}`} />
            )}
            {(p.status === "resizing" || p.status === "uploading") && (
              <div className="pu-loading" role="status">
                <span className="pu-spinner" aria-hidden />
                <span>{p.status === "resizing" ? "Redimensionnement et contrôle qualité…" : "Enregistrement…"}</span>
              </div>
            )}
            {p.status === "error" && <div className="pu-error" role="alert">{p.error}</div>}
            {i === 0 && p.status === "done" && <span className="pu-badge">Photo principale</span>}
            {p.report && p.status !== "error" && (
              <span className="pu-size" style={{ background: gradeColor[p.report.grade], color: "#fff" }} title={[...p.report.issues, ...p.report.fixes.map((x) => `✓ ${x}`)].join("\n") || "Aucun défaut détecté"}>
                {gradeLabel[p.report.grade]} · {p.report.score}
              </span>
            )}
            {p.status !== "resizing" && p.status !== "uploading" && (
              <div className="pu-actions">
                {p.status === "done" && i > 0 && (
                  <button type="button" className="pu-mini" onClick={() => move(i, 0)} title="Définir comme photo principale">
                    ★
                  </button>
                )}
                {p.status === "done" && i > 0 && (
                  <button type="button" className="pu-mini" onClick={() => move(i, i - 1)} aria-label="Déplacer vers la gauche" title="Déplacer vers la gauche">
                    ←
                  </button>
                )}
                {p.status === "done" && i < photos.length - 1 && (
                  <button type="button" className="pu-mini" onClick={() => move(i, i + 1)} aria-label="Déplacer vers la droite" title="Déplacer vers la droite">
                    →
                  </button>
                )}
                <IconButton label="Retirer cette photo" tone="danger" onClick={() => setPhotos((l) => l.filter((x) => x.key !== p.key))} style={{ width: 30, height: 30, background: "#fff" }}>
                  <TrashIcon width={15} height={15} />
                </IconButton>
              </div>
            )}
          </figure>
        ))}

        {photos.length < 12 && (
          <button
            type="button"
            className={`pu-drop${dragOver ? " is-over" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <span style={{ fontSize: "1.6rem" }} aria-hidden>
              📷
            </span>
            <strong>Ajouter des photos</strong>
            <span>Clique ou glisse tes fichiers ici</span>
          </button>
        )}
      </div>
      {photos.some((p) => p.report && p.status !== "error") && (
        <div className="pu-report" aria-live="polite">
          <strong style={{ fontSize: "0.85rem", color: "var(--forest)" }}>Contrôle qualité des photos ajoutées</strong>
          {photos.map((p, i) =>
            p.report && p.status !== "error" ? (
              <div key={p.key} className="pu-report-row">
                <span className="pu-report-grade" style={{ color: gradeColor[p.report.grade] }}>
                  Photo {i + 1} : {gradeLabel[p.report.grade]} ({p.report.score}/100)
                </span>
                {p.report.issues.length === 0 ? (
                  <span className="pu-report-ok">Nette, bien exposée, bonne définition.</span>
                ) : (
                  <ul>
                    {p.report.issues.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                )}
                {p.report.fixes.length > 0 && <span className="pu-report-fix">Amélioration automatique : {p.report.fixes.join(", ").toLowerCase()}.</span>}
              </div>
            ) : null
          )}
          {photos.some((p) => p.report?.grade === "faible" && p.status !== "error") && (
            <p className="pu-report-warn">⚠ Une photo de qualité faible donne une image peu professionnelle : remplace-la si possible par une photo plus nette, plus grande ou mieux éclairée.</p>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 8 }}>
        Chaque photo est automatiquement recadrée au centre, redimensionnée en {SIZE} × {SIZE} px (JPEG haute qualité), contrôlée (netteté,
        exposition, contraste, définition) et légèrement améliorée : toutes les photos de la boutique ont ainsi le même format. La 1re sert de vignette partout ; les suivantes défilent dans le carrousel. 12 photos maximum.
      </p>

      <style>{`
        .pu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; margin-top: 6px; }
        .pu-tile, .pu-drop { position: relative; aspect-ratio: 1; margin: 0; border-radius: 0.8rem; overflow: hidden; }
        .pu-tile { border: 1px solid var(--line); background: var(--ivory-deep); }
        .pu-tile.is-main { border: 2px solid var(--forest); }
        .pu-tile.is-error { border-color: var(--danger); }
        .pu-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pu-loading {
          position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 0.5rem;
          background: rgba(251,247,239,0.85); color: var(--forest); font-size: 0.78rem; font-weight: 600; text-align: center;
        }
        .pu-spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--line); border-top-color: var(--foliage); animation: pu-spin 0.8s linear infinite; }
        .pu-error { position: absolute; inset: 0; display: grid; place-items: center; padding: 0.6rem; background: #fbeae8; color: var(--danger); font-size: 0.75rem; text-align: center; }
        .pu-badge, .pu-size { position: absolute; left: 6px; font-size: 0.66rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 999px; }
        .pu-badge { top: 6px; background: var(--forest); color: var(--ivory); }
        .pu-size { bottom: 6px; background: rgba(255,255,255,0.9); color: var(--forest); }
        .pu-actions { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
        .pu-tile:hover .pu-actions, .pu-tile:focus-within .pu-actions, .pu-tile.is-error .pu-actions { opacity: 1; }
        @media (hover: none) { .pu-actions { opacity: 1; } }
        .pu-mini { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--line); background: #fff; cursor: pointer; font: inherit; font-size: 0.85rem; color: var(--forest); }
        .pu-mini:hover { border-color: var(--foliage); }
        .pu-drop {
          display: grid; place-content: center; justify-items: center; gap: 0.25rem; padding: 0.5rem;
          border: 2px dashed var(--line); background: #fff; color: var(--muted); font: inherit; font-size: 0.75rem; cursor: pointer; text-align: center;
        }
        .pu-drop strong { color: var(--forest); font-size: 0.85rem; }
        .pu-drop:hover, .pu-drop.is-over { border-color: var(--foliage); background: var(--foliage-soft); }
        .pu-report { margin-top: 0.9rem; padding: 0.85rem 1rem; border: 1px solid var(--line); border-radius: 0.8rem; background: var(--ivory); display: grid; gap: 0.6rem; }
        .pu-report-row { display: grid; gap: 0.15rem; font-size: 0.82rem; }
        .pu-report-grade { font-weight: 700; }
        .pu-report-row ul { margin: 0; padding-left: 1.1rem; color: var(--ink); }
        .pu-report-ok { color: var(--muted); }
        .pu-report-fix { color: var(--foliage); }
        .pu-report-warn { margin: 0; font-size: 0.82rem; color: var(--danger); font-weight: 600; }
        @keyframes pu-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
