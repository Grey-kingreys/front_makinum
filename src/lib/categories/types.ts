/** Aligné sur backend/src/categories/categories.types.ts (lecture seule). */
export interface CategoryListItem {
  id: string;
  nom: string;
  slug: string;
  parentId: string | null;
}
