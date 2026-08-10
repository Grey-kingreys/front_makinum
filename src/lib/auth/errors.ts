import { ApiError } from "@/lib/api";

/**
 * Messages transverses de `POST /auth/devenir-vendeur` (T48b) — même
 * convention que describeAdminUserError (src/lib/admin/errors.ts) : code
 * métier (backend/src/auth/auth.service.ts, `devenirVendeur`) → phrase
 * utilisateur.
 */
export function describeDevenirVendeurError(
  error: unknown,
  fallback = "Une erreur est survenue. Réessaie.",
): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "PHONE_REQUIRED":
        return "Un numéro de téléphone est requis pour devenir vendeur.";
      case "PHONE_ALREADY_USED":
        return "Ce numéro de téléphone est déjà utilisé par un autre compte.";
      case "ALREADY_VENDOR":
        return "Ton compte est déjà un compte vendeur.";
      case "ROLE_NOT_ELIGIBLE":
        return "Seul un compte acheteur peut devenir vendeur.";
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}

/** Champ du formulaire visé par une erreur API — voir describeDevenirVendeurFormError. */
export type DevenirVendeurFormField = "telephone";

export interface DevenirVendeurFormError {
  /** `null` : erreur générale, à afficher hors du champ téléphone (ex. ALREADY_VENDOR). */
  field: DevenirVendeurFormField | null;
  message: string;
}

/**
 * Mappe une erreur `POST /auth/devenir-vendeur` sur le champ téléphone du
 * formulaire quand pertinent (PHONE_REQUIRED/PHONE_ALREADY_USED) — même
 * convention que describeCategoryFormError (src/lib/categories/errors.ts) :
 * la modale reste ouverte pour permettre de corriger la saisie, le reste des
 * erreurs suit le circuit général.
 */
export function describeDevenirVendeurFormError(
  error: unknown,
  fallback = "Une erreur est survenue. Réessaie.",
): DevenirVendeurFormError {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "PHONE_REQUIRED":
        return { field: "telephone", message: "Un numéro de téléphone est requis pour devenir vendeur." };
      case "PHONE_ALREADY_USED":
        return {
          field: "telephone",
          message: "Ce numéro de téléphone est déjà utilisé par un autre compte.",
        };
      case "ALREADY_VENDOR":
        return { field: null, message: "Ton compte est déjà un compte vendeur." };
      case "ROLE_NOT_ELIGIBLE":
        return { field: null, message: "Seul un compte acheteur peut devenir vendeur." };
      default:
        return { field: null, message: error.message || fallback };
    }
  }
  return { field: null, message: fallback };
}
