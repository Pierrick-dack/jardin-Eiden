// Connexion à la base PostgreSQL via Drizzle + postgres.js
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL manquant. Renseigne-le dans .env (voir .env.example)."
  );
}

// En dev, Next recharge le module à chaque modif : on réutilise la connexion
// via une variable globale pour éviter d'épuiser le pool.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.client ??
  postgres(connectionString, {
    // Neon / Supabase : SSL requis, prepare désactivé pour le pooling
    prepare: false,
    max: 10,
    // Ferme les connexions inactives avant que l'hébergeur ne les coupe
    // (sinon la requête suivante échoue avec « Failed query »)
    idle_timeout: 20,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
export { schema };
