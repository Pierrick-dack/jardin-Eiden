// Photos produits stockées en base. Une adresse = un contenu figé (une
// nouvelle photo a une nouvelle adresse) : cache navigateur d'un an.
import { getMedia } from "@/lib/media";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = /^[a-z0-9]{10,40}$/.test(id) ? await getMedia(id) : undefined;
  if (!media) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(media.data), {
    headers: {
      "Content-Type": media.mime,
      "Content-Length": String(media.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
