import { ApiError } from "@/lib/api";

/**
 * Messages transverses du module admin/utilisateurs — même convention que
 * describeReportError (src/lib/reports/errors.ts) : code métier
 * (backend/src/reports/admin-users.errors.ts) → phrase utilisateur.
 */
export function describeAdminUserError(
  error: unknown,
  fallback = "Une erreur est survenue. Réessaie.",
): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "USER_NOT_FOUND":
        return "Cet utilisateur est introuvable.";
      case "CANNOT_SUSPEND_SELF":
        return "Tu ne peux pas suspendre ton propre compte.";
      case "RATE_LIMITED":
        return "Trop de tentatives, réessaie dans un moment.";
      // Conversion ACHETEUR → VENDEUR (T48b, PATCH { role: "VENDEUR" }) —
      // voir describeConvertVendeurFormError pour le mapping par champ.
      case "PHONE_REQUIRED":
        return "Un numéro de téléphone est requis pour convertir ce compte en vendeur.";
      case "PHONE_ALREADY_USED":
        return "Ce numéro de téléphone est déjà utilisé par un autre compte.";
      case "ALREADY_VENDOR":
        return "Ce compte est déjà un compte vendeur.";
      case "CANNOT_CONVERT_ADMIN":
        return "Impossible de convertir un compte administrateur en vendeur.";
      // Suppression de compte (T49b, DELETE /admin/utilisateurs/:id).
      case "USER_HAS_HISTORY":
        return "Ce compte a un historique (produits, demandes, avis ou signalements) : suspends-le plutôt que de le supprimer.";
      case "CANNOT_DELETE_ADMIN":
        return "Impossible de supprimer un compte administrateur.";
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}

/** Champ du formulaire de conversion visé par une erreur API — voir describeConvertVendeurFormError. */
export type ConvertVendeurFormField = "telephone";

export interface ConvertVendeurFormError {
  /** `null` : erreur générale, à afficher hors du champ téléphone (ex. ALREADY_VENDOR). */
  field: ConvertVendeurFormField | null;
  message: string;
}

/**
 * Mappe une erreur `PATCH /admin/utilisateurs/:id { role: "VENDEUR", ... }`
 * (T48b, action admin « Passer vendeur ») sur le champ téléphone de la modale
 * quand pertinent — même convention que describeCategoryFormError
 * (src/lib/categories/errors.ts) et describeDevenirVendeurFormError
 * (src/lib/auth/errors.ts, chemin libre-service équivalent).
 */
export function describeConvertVendeurFormError(
  error: unknown,
  fallback = "Une erreur est survenue. Réessaie.",
): ConvertVendeurFormError {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "PHONE_REQUIRED":
        return {
          field: "telephone",
          message: "Un numéro de téléphone est requis pour convertir ce compte en vendeur.",
        };
      case "PHONE_ALREADY_USED":
        return {
          field: "telephone",
          message: "Ce numéro de téléphone est déjà utilisé par un autre compte.",
        };
      case "ALREADY_VENDOR":
        return { field: null, message: "Ce compte est déjà un compte vendeur." };
      case "CANNOT_CONVERT_ADMIN":
        return { field: null, message: "Impossible de convertir un compte administrateur en vendeur." };
      default:
        return { field: null, message: error.message || fallback };
    }
  }
  return { field: null, message: fallback };
}

/**
 * Mappe une erreur `POST /admin/utilisateurs/:vendeurId/produits` (T52b,
 * action admin « Publier un produit ») — même convention que
 * describeAdminUserError. Codes propres aux 3 gardes de
 * `AdminUsersService.assertPublicationAutorisee`, dans l'ordre où le backend
 * les vérifie : cible introuvable ou de rôle ≠ VENDEUR (404
 * USER_NOT_FOUND, même code que le PATCH/DELETE existants), cible non
 * validée par un admin (403 VENDOR_NOT_VALIDATED, réutilisé du chemin
 * vendeur direct), cible n'ayant pas autorisé la publication admin (403
 * ADMIN_PUBLISH_NOT_AUTHORIZED) — plus la limite de catalogue, commune au
 * chemin vendeur direct (409 PRODUCT_LIMIT_REACHED).
 */
export function describeAdminCreateProductError(
  error: unknown,
  fallback = "Impossible de publier ce produit. Réessaie.",
): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "USER_NOT_FOUND":
        return "Ce vendeur est introuvable.";
      case "VENDOR_NOT_VALIDATED":
        return "Ce vendeur doit être validé par un administrateur avant de publier des produits.";
      case "ADMIN_PUBLISH_NOT_AUTHORIZED":
        return "Ce vendeur n'a pas autorisé l'équipe Makinum à publier des produits en son nom.";
      case "PRODUCT_LIMIT_REACHED":
        return "Le catalogue de ce vendeur est déjà plein (30 produits actifs) — désactive un produit avant d'en publier un nouveau.";
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}
