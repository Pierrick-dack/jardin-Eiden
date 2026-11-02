// Description produit : un extrait à côté des photos, le texte complet dans
// une section dédiée sous la fiche (lisible même pour les longs textes).

/** Au-delà, l'extrait est coupé et renvoie vers la section complète */
const LONG = 320;

export const isLongDescription = (text: string) => text.trim().length > LONG;

/** Paragraphes : ceux saisis par l'admin, sinon un découpage toutes les 3 phrases */
function paragraphs(text: string) {
  const typed = text.split(/\n\s*\n|\r?\n/).map((p) => p.trim()).filter(Boolean);
  if (typed.length > 1) return typed;
  const sentences = text.trim().match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) out.push(sentences.slice(i, i + 3).join("").trim());
  return out;
}

/** Extrait de la colonne d'infos (4 lignes max) + lien vers la description complète */
export function DescriptionExcerpt({ text }: { text: string }) {
  if (!isLongDescription(text)) {
    return <p style={{ fontSize: "1rem", lineHeight: 1.7, marginBottom: "1.75rem", maxWidth: "60ch", whiteSpace: "pre-line" }}>{text}</p>;
  }
  return (
    <div style={{ marginBottom: "1.75rem", maxWidth: "60ch" }}>
      <p className="desc-clamp">{text}</p>
      <a href="#description" className="desc-more">
        Lire la description complète
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </a>
      <style>{`
        .desc-clamp { margin: 0; font-size: 1rem; line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .desc-more { display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.5rem; font-size: 0.9rem; font-weight: 600; color: var(--foliage); }
        .desc-more:hover { color: var(--forest); }
      `}</style>
    </div>
  );
}

/** Section complète sous la fiche (uniquement pour les longues descriptions) */
export function DescriptionSection({ text, name }: { text: string; name: string }) {
  if (!isLongDescription(text)) return null;
  return (
    <section id="description" aria-labelledby="description-title" className="desc-section">
      <h2 id="description-title">Description</h2>
      <p className="desc-sub">{name}</p>
      <div className="desc-body">
        {paragraphs(text).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <style>{`
        .desc-section {
          margin-top: 2.5rem; padding: clamp(1.25rem, 3vw, 2.25rem); background: #fff;
          border: 1px solid var(--line); border-radius: 1.1rem; scroll-margin-top: 90px;
        }
        .desc-section h2 { font-size: 1.5rem; color: var(--forest); margin: 0; }
        .desc-sub { margin: 0.25rem 0 1.25rem; color: var(--muted); font-size: 0.9rem; }
        .desc-body { max-width: 75ch; display: grid; gap: 1rem; }
        .desc-body p { margin: 0; line-height: 1.8; font-size: 1rem; }
        .desc-section:target { animation: desc-flash 1.2s ease; }
        @keyframes desc-flash { from { box-shadow: 0 0 0 4px rgba(201,162,75,0.45); } to { box-shadow: 0 0 0 0 rgba(201,162,75,0); } }
      `}</style>
    </section>
  );
}
