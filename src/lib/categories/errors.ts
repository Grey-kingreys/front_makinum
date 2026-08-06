import { ApiError } from "@/lib/api";

/**
 * Messages transverses du module catégories — même convention que
 * describeAdminUserError (src/lib/admin/errors.ts) : code métier
 * (backend/src/categories/categories.service.ts) → phrase utilisateur.
 */
export function describeCategoryError(
  error: unknown,
  fallback = "Une erreur est survenue. Réessaie.",
): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "CATEGORY_NOT_FOUND":
        return "Cette catégorie est introuvable.";
      case "PARENT_NOT_FOUND":
        return "Catégorie parente introuvable.";
      case "CATEGORY_CYCLE":
        return "Cette opération créerait un cycle entre catégories.";
      case "SLUG_ALREADY_USED":
        return "Ce slug est déjà utilisé.";
      case "INVALID_SLUG":
        return "Slug invalide.";
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}

/** Champ du formulaire catégorie visé par une erreur API — voir describeCategoryFormError. */
export type CategoryFormField = "nom" | "slug" | "parent";

export interface CategoryFormError {
  /** `null` : erreur générale, à afficher hors formulaire (ex. CATEGORY_NOT_FOUND). */
  field: CategoryFormField | null;
  message: string;
}

/**
 * Mappe une erreur POST /categories ou PATCH /categories/:id sur le champ du
 * formulaire concerné (T31b, spec produit) : SLUG_ALREADY_USED/INVALID_SLUG
 * → slug, CATEGORY_CYCLE/PARENT_NOT_FOUND → parent, le reste → erreur générale.
 */
export function describeCategoryFormError(
  error: unknown,
  fallback = "Une erreur est survenue. Réessaie.",
): CategoryFormError {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "SLUG_ALREADY_USED":
        return { field: "slug", message: "Ce slug est déjà utilisé." };
      case "INVALID_SLUG":
        return { field: "slug", message: "Slug invalide — utilise des lettres, chiffres et tirets." };
      case "CATEGORY_CYCLE":
        return {
          field: "parent",
          message: "Cette catégorie ne peut pas devenir sa propre descendante.",
        };
      case "PARENT_NOT_FOUND":
        return { field: "parent", message: "Catégorie parente introuvable." };
      case "CATEGORY_NOT_FOUND":
        return { field: null, message: "Cette catégorie est introuvable." };
      default:
        return { field: null, message: error.message || fallback };
    }
  }
  return { field: null, message: fallback };
}
