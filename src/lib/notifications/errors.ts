import { ApiError } from "@/lib/api";

/**
 * Messages transverses du module notifications — même convention que
 * describeDemandeError (src/lib/purchase-requests/errors.ts) : code métier
 * (backend/src/notifications/notifications.errors.ts) → phrase utilisateur.
 */
export function describeNotificationError(
  error: unknown,
  fallback = "Une erreur est survenue. Réessaie.",
): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "NOTIFICATION_NOT_FOUND":
        return "Cette notification est introuvable.";
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}
