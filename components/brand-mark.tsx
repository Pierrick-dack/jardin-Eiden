// Logotype botanique — une feuille stylisée dans un cercle
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="23" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M24 10 C31 17 31 31 24 38 C17 31 17 17 24 10 Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M24 12 L24 36"
        stroke="var(--ivory)"
        strokeWidth="1"
        opacity="0.6"
      />
    </svg>
  );
}
