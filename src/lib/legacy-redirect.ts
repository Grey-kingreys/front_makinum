/**
 * T61a — Redirection d'hôte legacy → domaine canonique (migration
 * makinum.kingreys.fr → makinum.com).
 *
 * Fonction pure, sans dépendance au runtime Next (`next/server`), pour
 * pouvoir être testée en isolation. `src/proxy.ts` (convention Next.js 16 —
 * l'ancien `middleware.ts` a été renommé, voir
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)
 * l'appelle avec les en-têtes de la requête réelle.
 */

/** Sépare `LEGACY_REDIRECT_HOSTS` en liste d'hôtes normalisés (minuscules, sans espace). */
function parseLegacyHosts(legacyHostsEnv: string | undefined): string[] {
  if (!legacyHostsEnv) return [];
  return legacyHostsEnv
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter((host) => host.length > 0);
}

/** L'en-tête `Host` peut inclure un port (`exemple.fr:3101`) : on ne compare que le nom d'hôte. */
function stripPort(host: string): string {
  return host.split(":")[0];
}

export interface ResolveLegacyRedirectParams {
  /** Valeur de l'en-tête `Host` de la requête entrante (`request.headers.get("host")`). */
  requestHost: string | null | undefined;
  /** `pathname + search` de la requête à préserver (ex. `/produits/x?y=1`). */
  pathWithQuery: string;
  /** Valeur brute de l'env `LEGACY_REDIRECT_HOSTS` (liste CSV, insensible à la casse). */
  legacyHostsEnv: string | undefined;
  /** Valeur brute de l'env `NEXT_PUBLIC_SITE_URL` (déjà existante depuis T53, build-time). */
  siteUrlEnv: string | undefined;
}

/**
 * Calcule l'URL absolue de redirection pour une requête reçue sur un hôte
 * legacy, ou `null` si aucune redirection ne s'applique.
 *
 * No-op strict (retourne `null`) si `legacyHostsEnv` est absent/vide, si
 * `siteUrlEnv` est absent, ou si l'hôte de la requête ne figure pas dans la
 * liste : le dev local (aucune des deux variables définies) et tout
 * déploiement sans elles restent rigoureusement inchangés.
 */
export function resolveLegacyRedirectTarget({
  requestHost,
  pathWithQuery,
  legacyHostsEnv,
  siteUrlEnv,
}: ResolveLegacyRedirectParams): string | null {
  if (!requestHost || !siteUrlEnv) return null;

  const legacyHosts = parseLegacyHosts(legacyHostsEnv);
  if (legacyHosts.length === 0) return null;

  const normalizedRequestHost = stripPort(requestHost.trim().toLowerCase());
  if (!legacyHosts.includes(normalizedRequestHost)) return null;

  const base = siteUrlEnv.endsWith("/") ? siteUrlEnv.slice(0, -1) : siteUrlEnv;
  return `${base}${pathWithQuery}`;
}
