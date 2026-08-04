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
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}
