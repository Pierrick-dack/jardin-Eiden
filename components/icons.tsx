// Icônes (SVG en ligne, couleur héritée du texte) et bouton-icône accessible
import type { ButtonHTMLAttributes, ReactNode, SVGProps } from "react";

function Svg({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {children}
    </svg>
  );
}

export const PencilIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Svg>
);

export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
);

export const BellIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Svg>
);

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const ExternalIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Svg>
);

export const EyeOffIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c7 0 10 8 10 8a17.6 17.6 0 0 1-2.2 3.2" />
    <path d="M6.6 6.6A17.5 17.5 0 0 0 2 12s3 8 10 8a10.4 10.4 0 0 0 5.4-1.6" />
    <path d="M2 2l20 20" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Svg>
);

export const EyeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Texte lu par les lecteurs d'écran et affiché au survol */
  label: string;
  tone?: "default" | "danger";
  children: ReactNode;
};

/** Bouton carré ne montrant qu'une icône ; le libellé reste accessible */
export function IconButton({ label, tone = "default", children, style, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`icon-btn${tone === "danger" ? " icon-btn-danger" : ""}`}
      style={style}
    >
      {children}
    </button>
  );
}
