// Toutes les pages admin lisent la session et des données live :
// elles doivent être rendues à la requête, pas prérendues.
export const instant = false;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
