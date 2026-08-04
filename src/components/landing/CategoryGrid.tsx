/**
 * Grille des catégories de la section « Ce qui se vend ». Affichées en dur
 * pour l'instant — le listing dynamique (recherche par catégorie, comptages
 * réels) branchera l'API en T15. Simple liste, pas de liens : aucune page de
 * résultats par catégorie n'existe encore.
 */

const CATEGORIES = ["Alimentation", "Mode & tissus", "Électronique", "Maison", "Matériaux", "Services"] as const;

export function CategoryGrid() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {CATEGORIES.map((name) => (
        <li
          key={name}
          className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white px-4 py-6 text-center"
        >
          <span className="h-9 w-9 rounded-full bg-tint-accent" aria-hidden="true" />
          <span className="text-[14px] font-medium text-ink">{name}</span>
        </li>
      ))}
    </ul>
  );
}
