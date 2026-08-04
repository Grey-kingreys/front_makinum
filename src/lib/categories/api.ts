import { apiFetch } from "@/lib/api";

import type { CategoryListItem } from "./types";

/** GET /categories — public, catégories actives triées par nom. */
export function listCategories(): Promise<CategoryListItem[]> {
  return apiFetch<CategoryListItem[]>("/categories", { method: "GET" });
}
