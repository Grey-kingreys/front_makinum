import { apiFetch } from "@/lib/api";
import type { PublicUser } from "@/lib/auth/types";

/**
 * Corps de `PATCH /vendeur/parametres` — les deux réglages sont optionnels
 * indépendamment côté backend (`UpdateVendorSettingsDto`, T52a/T66a) : un
 * champ absent n'est pas modifié, un champ présent l'est (`lieuVente: null`
 * retire le lieu de vente — distinct d'un champ absent, voir
 * `VendorSettingsService.mettreAJour`, backend). Le backend refuse un corps
 * ne fournissant NI l'un NI l'autre (400 NO_FIELDS_TO_UPDATE) — chaque appel
 * doit donc toujours porter au moins un des deux champs.
 */
export interface VendorSettingsInput {
  autoriseAdminPublication?: boolean;
  /** Position déclarative du lieu de vente ; `null` pour la retirer. */
  lieuVente?: { latitude: number; longitude: number } | null;
}

/**
 * `PATCH /vendeur/parametres` (T52a/T52b, étendu T66a) — réglages
 * libre-service du compte vendeur : `autoriseAdminPublication` (consentement
 * à ce qu'un administrateur publie/modifie des produits en son nom, voir
 * src/lib/admin/api.ts, `createProductForVendor`) et `lieuVente` (position du
 * lieu de vente, pré-remplit chaque nouvelle publication côté ProductForm,
 * T66b). Pas de garde métier sur l'un ou l'autre — le vendeur les modifie
 * librement. Renvoie le `PublicUser` à jour ; la session en mémoire
 * (`useAuth().user`) ne le reflète pas tant qu'elle n'a pas été rafraîchie —
 * à la charge de l'appelant (même convention que `devenirVendeur`,
 * src/lib/auth/api.ts).
 */
export function updateVendorSettings(input: VendorSettingsInput): Promise<PublicUser> {
  return apiFetch<PublicUser>("/vendeur/parametres", {
    method: "PATCH",
    body: input,
  });
}
