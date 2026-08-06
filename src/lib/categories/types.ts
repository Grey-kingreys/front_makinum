/** Aligné sur backend/src/categories/categories.types.ts (lecture seule). */
export interface CategoryListItem {
  id: string;
  nom: string;
  slug: string;
  parentId: string | null;
}

/**
 * Élément du listing admin (GET /categories/admin) : mêmes champs que
 * `CategoryListItem`, plus `actif` — liste complète, actives et inactives
 * (T31b).
 */
export interface AdminCategoryListItem extends CategoryListItem {
  actif: boolean;
}
