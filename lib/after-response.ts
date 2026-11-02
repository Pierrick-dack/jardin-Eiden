// Lance une tâche après la réponse HTTP (ex. envoi d'email) quand on est dans
// une requête Next.js ; sinon (script, tâche de fond) l'exécute aussitôt.
import { after } from "next/server";

export function afterResponse(task: () => Promise<unknown>) {
  try {
    after(task);
  } catch {
    void task();
  }
}
