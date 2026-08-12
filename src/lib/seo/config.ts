/**
 * Config SEO partagée (T53) : adresse publique du site et image Open Graph
 * par défaut, réutilisées par le layout racine, robots.ts, sitemap.ts et les
 * `generateMetadata` de /produits/[id] et /vendeurs/[id].
 */

const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * URL publique du site, sans slash final. `NEXT_PUBLIC_SITE_URL` est une
 * variable de build (inlinée par Next au moment de `next build`, comme
 * `NEXT_PUBLIC_API_URL` — voir Dockerfile) : en prod, une valeur absente est
 * bloquée tôt par la garde du Dockerfile plutôt que de retomber ici sur
 * `localhost`. Le repli ne joue donc qu'en dev/test.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) return DEFAULT_SITE_URL;
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
}

/**
 * Image Open Graph/Twitter de repli : aucune image dédiée n'existe pour le
 * site ou pour une fiche vendeur (les vendeurs n'ont pas de photo de profil,
 * seulement des initiales) — plutôt que de fabriquer une image, on réutilise
 * l'icône PWA 512×512 déjà présente dans public/icons (cf. src/app/manifest.ts).
 */
export const DEFAULT_OG_IMAGE_PATH = "/icons/icon-512.png";
export const DEFAULT_OG_IMAGE_SIZE = { width: 512, height: 512 };
