/**
 * Petits formatteurs partagés par les écrans acheteur (T15) : prix GNF et
 * initiales d'avatar. Isolés ici plutôt que dupliqués dans chaque composant
 * (carte produit, fiche produit, sidebar).
 */

const gnfFormatter = new Intl.NumberFormat("fr-FR");
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

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

/** Date lisible (ex. "4 août 2026") à partir d'un ISO backend (dates des demandes d'achat, T16). */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateFormatter.format(date);
}

/** Initiales d'affichage (avatar) à partir d'un nom complet — "Fatoumata Bangoura" → "FB". */
export function initialsFromName(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
