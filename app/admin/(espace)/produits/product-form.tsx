"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Category, Product, ProductImage } from "@/lib/db/schema";
import { PhotoUploader } from "@/components/admin/photo-uploader";
import type { ProductFormState } from "./actions";

type Props = {
  action: (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: Category[];
  product?: Product & { images: ProductImage[] };
  submitLabel: string;
};

export function ProductForm({ action, categories, product, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [photosBusy, setPhotosBusy] = useState(false);
  const media = product?.images ?? [];
  const images = media.filter((m) => m.kind === "image").map((m) => m.url);
  const video = media.find((m) => m.kind === "video")?.url ?? "";

  return (
    <form action={formAction} className="pf">
      <Section title="Informations" hint="Ce que le client lit sur la fiche produit.">
        <div>
          <label htmlFor="name">Nom du produit *</label>
          <input id="name" name="name" required minLength={2} defaultValue={product?.name} className="field" style={{ marginTop: 6 }} placeholder="Ex : Baskets en toile blanche" />
        </div>
        <div>
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            required
            minLength={5}
            rows={5}
            defaultValue={product?.description}
            className="field"
            style={{ marginTop: 6, resize: "vertical" }}
            placeholder="Matières, utilisation, conseils, tailles disponibles…"
          />
        </div>
        <div className="pf-row">
          <div>
            <label htmlFor="audience">Public *</label>
            <select id="audience" name="audience" defaultValue={product?.audience ?? "UNISEXE"} className="field" style={{ marginTop: 6 }}>
              <optgroup label="Adultes">
                <option value="UNISEXE">Mixte (homme et femme)</option>
                <option value="FEMME">Femme</option>
                <option value="HOMME">Homme</option>
              </optgroup>
              <optgroup label="Enfants">
                <option value="ENFANT">Enfant (fille et garçon)</option>
                <option value="FILLE">Fille</option>
                <option value="GARCON">Garçon</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label htmlFor="categoryId">Catégorie</label>
            <select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ""} className="field" style={{ marginTop: 6 }}>
              <option value="">— Aucune —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Prix et stock">
        <div className="pf-row">
          <div>
            <label htmlFor="price">Prix (FCFA) *</label>
            <input id="price" name="price" type="number" min={100} step={50} required defaultValue={product?.price} className="field" style={{ marginTop: 6 }} />
          </div>
          <div>
            <label htmlFor="stock">Stock disponible *</label>
            <input id="stock" name="stock" type="number" min={0} required defaultValue={product?.stock ?? 0} className="field" style={{ marginTop: 6 }} />
          </div>
        </div>
      </Section>

      <Section title="Photos" hint="Au moins une photo est nécessaire pour publier le produit.">
        <PhotoUploader name="images" initial={images} onBusyChange={setPhotosBusy} />
      </Section>

      <Section title="Vidéo courte (facultatif)">
        <input
          id="videoUrl"
          name="videoUrl"
          aria-label="Adresse de la vidéo"
          defaultValue={video}
          placeholder="https://www.youtube.com/watch?v=… ou https://…/video.mp4"
          className="field"
        />
        <p className="pf-hint">
          Lien YouTube (vidéo ou Short) ou fichier MP4 / WebM. Affichée en 2e position dans le carrousel, avec un bouton lecture. Laisse vide pour aucune
          vidéo.
        </p>
      </Section>

      <Section title="Mise en avant">
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 400 }}>
          <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured ?? false} />
          Afficher ce produit dans la sélection de la page d&apos;accueil
        </label>
      </Section>

      <div className="pf-foot">
        {!product && (
          <p className="pf-note">
            🔒 Le produit est enregistré en <strong>brouillon</strong> : il n&apos;apparaît pas en boutique. Tu le vérifies sur son aperçu, puis tu le publies.
          </p>
        )}
        {state.error && (
          <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.9rem" }}>
            {state.error}
          </p>
        )}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-primary" disabled={pending || photosBusy}>
            {photosBusy ? "Photos en cours de traitement…" : pending ? "Enregistrement…" : submitLabel}
          </button>
          <Link href="/admin/produits" className="btn btn-outline">
            Annuler
          </Link>
        </div>
      </div>

      <style>{`
        .pf { display: grid; gap: 1rem; max-width: 760px; }
        .pf-section { border: 1px solid var(--line); border-radius: 1rem; padding: 1.25rem 1.4rem; background: #fff; display: grid; gap: 1rem; }
        .pf-section h2 { font-size: 1.05rem; color: var(--forest); margin: 0; }
        .pf-hint { font-size: 0.78rem; color: var(--muted); margin: 0; }
        .pf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .pf-foot { display: grid; gap: 0.75rem; position: sticky; bottom: 0; padding: 0.9rem 0; background: var(--ivory); }
        .pf-note { margin: 0; font-size: 0.85rem; padding: 0.7rem 0.9rem; border-radius: 0.7rem; background: #fdf6e3; border: 1px solid #e8d4a0; }
        @media (max-width: 560px) { .pf-row { grid-template-columns: 1fr; } }
      `}</style>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="pf-section">
      <div>
        <h2>{title}</h2>
        {hint && <p className="pf-hint" style={{ marginTop: 4 }}>{hint}</p>}
      </div>
      {children}
    </section>
  );
}
