// Vidéos produits : fichier MP4/WebM hébergé, ou lien YouTube (lu dans un
// lecteur intégré).

/** Identifiant YouTube d'un lien (watch, youtu.be, shorts, embed, live), sinon null */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Lien accepté comme vidéo : YouTube ou fichier vidéo (/… ou https://…) */
export function isSupportedVideoUrl(url: string) {
  if (youtubeId(url)) return true;
  return (url.startsWith("/") || /^https?:\/\//.test(url)) && /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

/** Lecteur YouTube sans cookies publicitaires tant que la vidéo n'est pas lue */
export const youtubeEmbedUrl = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

export const youtubeThumb = (id: string, quality: "maxresdefault" | "hqdefault" = "maxresdefault") =>
  `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
