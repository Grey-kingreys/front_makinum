import { apiFetch } from "@/lib/api";

import type { PublicUser } from "./types";

/**
 * `POST /auth/devenir-vendeur` (T48a/T48b) — chemin libre-service ACHETEUR →
 * VENDEUR. `telephone` optionnel : ignoré si le compte a déjà un numéro,
 * sinon obligatoire (sans quoi l'API répond `400 PHONE_REQUIRED`) — même
 * sémantique que `sendPurchaseRequest` (T36, src/lib/purchase-requests/api.ts).
 * Le rôle prend effet immédiatement avec le même access token : pas de
 * reconnexion nécessaire, mais la session en mémoire (`user` de useAuth)
 * reste celle d'avant l'appel tant qu'elle n'a pas été rafraîchie — à la
 * charge de l'appelant (voir DevenirVendeurView, `refresh()` après succès).
 */
export function devenirVendeur(telephone?: string): Promise<PublicUser> {
  return apiFetch<PublicUser>("/auth/devenir-vendeur", {
    method: "POST",
    body: telephone ? { telephone } : undefined,
  });
}
