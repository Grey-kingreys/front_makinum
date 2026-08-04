import { ApiError } from "@/lib/api";

/**
 * Messages transverses du module avis — même convention que
 * describeDemandeError (src/lib/purchase-requests/errors.ts) : code métier
 * (backend/src/reviews/reviews.errors.ts) → phrase utilisateur.
 */
export function describeReviewError(
  error: unknown,
  fallback = "Une erreur est survenue. Réessaie.",
): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "REQUEST_NOT_CLOSED":
        return "Cette demande n'est pas encore clôturée : l'avis n'est pas encore possible.";
      case "REVIEW_ALREADY_EXISTS":
        return "Tu as déjà laissé un avis pour cette demande.";
      case "PURCHASE_REQUEST_NOT_FOUND":
        return "Cette demande est introuvable.";
      case "VENDOR_NOT_FOUND":
        return "Ce vendeur est introuvable.";
      case "RATE_LIMITED":
        return "Trop de tentatives, réessaie dans un moment.";
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}
