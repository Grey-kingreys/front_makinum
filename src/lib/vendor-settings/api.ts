import { apiFetch } from "@/lib/api";
import type { PublicUser } from "@/lib/auth/types";

/**
 * `PATCH /vendeur/parametres` (T52a/T52b) — réglages libre-service du compte
 * vendeur. Un seul réglage aujourd'hui : `autoriseAdminPublication`,
 * consentement à ce qu'un administrateur publie/modifie des produits en son
 * nom (voir src/lib/admin/api.ts, `createProductForVendor`). Champ requis et
 * booléen strict côté backend (`UpdateVendorSettingsDto`) — pas de garde
 * métier, le vendeur active/désactive librement. Renvoie le `PublicUser` à
 * jour ; la session en mémoire (`useAuth().user`) ne le reflète pas tant
 * qu'elle n'a pas été rafraîchie — à la charge de l'appelant (même
 * convention que `devenirVendeur`, src/lib/auth/api.ts).
 */
export function updateVendorSettings(autoriseAdminPublication: boolean): Promise<PublicUser> {
  return apiFetch<PublicUser>("/vendeur/parametres", {
    method: "PATCH",
    body: { autoriseAdminPublication },
  });
}
