import { apiFetch } from "@/lib/api";

import type { AdminCategoryListItem, CategoryListItem } from "./types";

/** GET /categories — public, catégories actives triées par nom. */
export function listCategories(): Promise<CategoryListItem[]> {
  return apiFetch<CategoryListItem[]>("/categories", { method: "GET" });
}

/**
 * GET /categories — même endpoint que `listCategories`, utilisé côté
 * serveur par la landing (CategoryGrid, T31b) avec le cache Next.js
 * configuré : `next: { revalidate: 300 }` (5 min), plutôt qu'un fetch à
 * chaque requête.
 */
export function listCategoriesCached(): Promise<CategoryListItem[]> {
  return apiFetch<CategoryListItem[]>("/categories", {
    method: "GET",
    next: { revalidate: 300 },
  });
}

/**
 * GET /categories/admin (JWT admin) — toutes les catégories, actives et
 * inactives, triées par nom (T31b, /admin/categories).
 */
export function listAdminCategories(): Promise<AdminCategoryListItem[]> {
  return apiFetch<AdminCategoryListItem[]>("/categories/admin", { method: "GET" });
}

export interface CreateCategoryInput {
  nom: string;
  /** Si absent, généré côté backend depuis `nom` (kebab-case). */
  slug?: string;
  parentId?: string;
}

/** POST /categories (JWT admin) → catégorie créée. */
export function createCategory(input: CreateCategoryInput): Promise<AdminCategoryListItem> {
  return apiFetch<AdminCategoryListItem>("/categories", { method: "POST", body: input });
}

export interface UpdateCategoryInput {
  nom?: string;
  slug?: string;
  /** `null` explicite détache la catégorie (redevient racine) ; absent = inchangé. */
  parentId?: string | null;
  actif?: boolean;
}

/** PATCH /categories/:id (JWT admin) → catégorie mise à jour. */
export function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<AdminCategoryListItem> {
  return apiFetch<AdminCategoryListItem>(`/categories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}
