import Link from "next/link";

import { listCategoriesCached } from "@/lib/categories/api";
import type { CategoryListItem } from "@/lib/categories/types";

/**
 * Grille des catégories de la section « Ce qui se vend ». Branchée sur
 * GET /categories (public, actives seulement, T31b) en fetch server-side
 * avec revalidation 5 min (`next: { revalidate: 300 }`) — la landing ne doit
 * jamais planter ni afficher une grille vide : repli sur la liste statique
 * des 6 catégories du seed (backend/prisma/seed.ts) si l'appel échoue ou
 * renvoie une liste vide. Le design de référence
 * (docs/Design de marketplace locale/Makinum.dc.html) n'a pas d'icônes
 * dédiées par catégorie — une seule pastille pour toutes, connues ou non.
 *
 * T64③ : chaque tuile est un lien vers /produits?categorie=<slug> — même
 * pour les catégories de repli (`FALLBACK_CATEGORIES`, slugs alignés sur le
 * seed) — ProduitsView valide le slug côté client contre GET /categories à
 * l'arrivée et retombe sur « Tous » s'il est inconnu.
 */

const FALLBACK_CATEGORIES: CategoryListItem[] = [
  { id: "fallback-alimentation", nom: "Alimentation", slug: "alimentation", parentId: null },
  { id: "fallback-mode-tissus", nom: "Mode & tissus", slug: "mode-tissus", parentId: null },
  { id: "fallback-electronique", nom: "Électronique", slug: "electronique", parentId: null },
  { id: "fallback-maison", nom: "Maison", slug: "maison", parentId: null },
  { id: "fallback-materiaux", nom: "Matériaux", slug: "materiaux", parentId: null },
  { id: "fallback-services", nom: "Services", slug: "services", parentId: null },
];

async function loadCategories(): Promise<CategoryListItem[]> {
  try {
    const categories = await listCategoriesCached();
    return categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  } catch {
    return FALLBACK_CATEGORIES;
  }
}

export async function CategoryGrid() {
  const categories = await loadCategories();

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={`/produits?categorie=${encodeURIComponent(category.slug)}`}
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white px-4 py-6 text-center transition-colors hover:border-brand"
          >
            <span className="h-9 w-9 rounded-full bg-tint-accent" aria-hidden="true" />
            <span className="text-[14px] font-medium text-ink">{category.nom}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
