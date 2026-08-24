import { apiFetch } from "@/lib/api";

import type { PublicUser, UpdateMeInput, UpdateMeResponse } from "./types";

/**
 * `PATCH /auth/me` (T68a/T68b) — modification libre-service de son propre
 * compte (nom, téléphone, mot de passe — voir {@link UpdateMeInput}). La
 * réponse ne porte `accessToken` que si le mot de passe a été changé : le
 * cookie de rafraîchissement est reposé dans la même réponse HTTP (backend,
 * `AuthController.updateMe` → `corpsSession`) et toutes les autres sessions
 * de l'utilisateur sont révoquées — l'appareil courant reste connecté en
 * adoptant ce nouveau jeton (voir `useAuth().applyUpdatedUser`,
 * AuthProvider.tsx). Pour tout autre champ modifié, seul `user` est renvoyé,
 * la session en mémoire (`useAuth().user`) ne le reflète pas tant que
 * l'appelant ne l'a pas adoptée explicitement (même convention que
 * `devenirVendeur`/`updateVendorSettings`).
 */
export function updateMe(input: UpdateMeInput): Promise<UpdateMeResponse> {
  return apiFetch<UpdateMeResponse>("/auth/me", {
    method: "PATCH",
    body: input,
  });
}

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
