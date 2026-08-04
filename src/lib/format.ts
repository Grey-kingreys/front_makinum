/**
 * Petits formatteurs partagés par les écrans acheteur (T15) : prix GNF et
 * initiales d'avatar. Isolés ici plutôt que dupliqués dans chaque composant
 * (carte produit, fiche produit, sidebar).
 */

const gnfFormatter = new Intl.NumberFormat("fr-FR");

/**
 * Formate un prix décimal exact (chaîne backend, ex. "185000") en
 * "185 000 GNF". `Number()` est sûr ici : le backend garantit un décimal
 * valide, jamais de notation exponentielle ni de séparateur de milliers.
 */
export function formatPrixGNF(prix: string): string {
  const value = Number(prix);
  if (!Number.isFinite(value)) return `${prix} GNF`;
  return `${gnfFormatter.format(value)} GNF`;
}

/** Initiales d'affichage (avatar) à partir d'un nom complet — "Fatoumata Bangoura" → "FB". */
export function initialsFromName(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
