// Envoi d'emails transactionnels via Brevo (offre gratuite : 300 emails/jour).
// Configuration (.env) : BREVO_API_KEY, EMAIL_FROM (adresse expéditeur
// vérifiée dans Brevo) et EMAIL_FROM_NAME.
// Sans BREVO_API_KEY (développement) : l'email est enregistré dans .emails/
// et son chemin affiché dans le terminal, pour tester sans rien envoyer.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type Email = {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  /** Pièces jointes (ex. facture PDF) */
  attachments?: { name: string; content: Uint8Array }[];
};

export async function sendEmail(email: Email): Promise<{ ok: boolean; error?: string }> {
  // En développement, l'email (et donc ses liens, ex. validation du compte)
  // est toujours affiché dans le terminal : utile si le message n'arrive pas.
  if (process.env.NODE_ENV !== "production") logToConsole(email);

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return saveLocally(email);

  const from = process.env.EMAIL_FROM;
  if (!from) return { ok: false, error: "EMAIL_FROM manquant" };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: from, name: process.env.EMAIL_FROM_NAME || "Le Jardin d'Eïden" },
        to: [email.to],
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
        ...(email.attachments?.length && {
          attachment: email.attachments.map((a) => ({ name: a.name, content: Buffer.from(a.content).toString("base64") })),
        }),
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error(`[email] Brevo ${res.status} :`, detail);
      return { ok: false, error: `Brevo ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] envoi impossible :", e);
    return { ok: false, error: "Envoi impossible" };
  }
}

function logToConsole(email: Email) {
  const line = "─".repeat(64);
  const mode = process.env.BREVO_API_KEY ? "envoyé via Brevo" : "NON envoyé (pas de BREVO_API_KEY)";
  console.log(
    [
      "",
      `┌${line}`,
      `│ 📧 EMAIL (dev) — ${mode}`,
      `│ À     : ${email.to.name ? `${email.to.name} <${email.to.email}>` : email.to.email}`,
      `│ Objet : ${email.subject}`,
      `├${line}`,
      ...email.text.split("\n").map((l) => `│ ${l}`),
      ...(email.attachments ?? []).map((a) => `│ 📎 ${a.name} (${Math.round(a.content.length / 1024)} Ko)`),
      `└${line}`,
      "",
    ].join("\n")
  );
}

async function saveLocally(email: Email) {
  const dir = path.join(process.cwd(), ".emails");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${email.to.email}.html`);
  await writeFile(file, `<!-- À : ${email.to.email}\nObjet : ${email.subject} -->\n${email.html}`);
  console.log(`[email] aperçu HTML enregistré : ${file}`);
  for (const a of email.attachments ?? []) {
    const attFile = file.replace(/\.html$/, `-${a.name}`);
    await writeFile(attFile, a.content);
    console.log(`[email] pièce jointe enregistrée : ${attFile}`);
  }
  return { ok: true };
}
