// Jetons de session signés (HMAC-SHA256) : "<id>:<expiration>.<signature>".
// Partagé par la session admin et la session client.
import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  const s = process.env.SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET (ou ADMIN_SESSION_SECRET) manquant ou trop court.");
  }
  return s;
}

/** `scope` distingue les sessions (un jeton admin n'est pas valable côté client) */
function mac(scope: string, value: string) {
  return createHmac("sha256", secret()).update(`${scope}|${value}`).digest("hex");
}

export function createToken(scope: string, id: string, maxAgeSeconds: number) {
  const value = `${id}:${Date.now() + maxAgeSeconds * 1000}`;
  return `${value}.${mac(scope, value)}`;
}

/** Renvoie l'id contenu dans le jeton s'il est intact et non expiré */
export function readToken(scope: string, token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const value = token.slice(0, idx);
  try {
    const a = Buffer.from(token.slice(idx + 1), "hex");
    const b = Buffer.from(mac(scope, value), "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const [id, expiry] = value.split(":");
  if (!id || !expiry || Date.now() > Number(expiry)) return null;
  return id;
}
