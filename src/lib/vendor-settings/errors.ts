import { ApiError } from "@/lib/api";

/**
 * Messages du module réglages vendeur — même convention que
 * describeAdminUserError (src/lib/admin/errors.ts). Le contrat backend
 * (T52a) n'a aucune garde métier propre à `PATCH /vendeur/parametres` :
 * 403 seulement pour un rôle non-VENDEUR (page déjà protégée par
 * VendeurGuard, ne devrait jamais se produire depuis cet écran) et 400 pour
 * une valeur non booléenne (impossible depuis ce toggle, qui envoie toujours
 * un booléen strict) — un message générique suffit.
 */
export function describeVendorSettingsError(
  error: unknown,
  fallback = "Impossible d'enregistrer ce réglage. Réessaie.",
): string {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  return fallback;
}
