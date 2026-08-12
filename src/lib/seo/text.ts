/**
 * Troncature de description pour les meta-tags (T53) : ~160 caractères,
 * limite usuelle affichée par Google/Facebook/WhatsApp, sans couper un mot
 * en deux.
 */
export function truncateDescription(text: string, maxLength = 160): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;

  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const safe = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${safe.trimEnd()}…`;
}
