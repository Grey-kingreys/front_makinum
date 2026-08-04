import { ApiError } from "@/lib/api";

/**
 * Messages transverses du module signalements — même convention que
 * describeReviewError (src/lib/reviews/errors.ts) : code métier
 * (backend/src/reports/reports.errors.ts) → phrase utilisateur.
 */
export function describeReportError(
  error: unknown,
  fallback = "Une erreur est survenue. Réessaie.",
): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "CANNOT_REPORT_SELF":
        return "Impossible de se signaler soi-même.";
      case "REPORT_TARGET_NOT_FOUND":
        return "Cet utilisateur est introuvable.";
      case "PRODUCT_NOT_TARGET_OWNER":
        return "Ce produit n'appartient pas à cet utilisateur.";
      case "REPORT_NOT_FOUND":
        return "Ce signalement est introuvable.";
      case "REPORT_ALREADY_TREATED":
        return "Ce signalement a déjà été traité.";
      case "ACTION_REQUIRES_TREATED_STATUS":
        return "Une action n'est applicable qu'en passant le signalement à « Traité ».";
      case "DEACTIVATION_REQUIRES_PRODUCT":
        return "La désactivation exige un signalement rattaché à un produit.";
      case "RATE_LIMITED":
        return "Trop de tentatives, réessaie dans un moment.";
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}
