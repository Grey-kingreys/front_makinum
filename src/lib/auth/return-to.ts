/**
 * Retour post-connexion vers la page consultée avant d'être renvoyé vers
 * /connexion ou /inscription (T51 — catalogue consultable sans compte, la
 * connexion n'est exigée qu'au moment d'agir : ajout à la demande, contact
 * vendeur, signalement…). Protection open-redirect volontairement stricte :
 * seul un chemin interne de l'app est accepté, jamais une URL absolue ni un
 * schéma alternatif (`javascript:`…) — cf. OWASP Unvalidated Redirects and
 * Forwards.
 */

export const RETURN_TO_PARAM = "returnTo";

const DEFAULT_RETURN_TO = "/dashboard";

interface ReadonlySearchParams {
  get(name: string): string | null;
}

/**
 * Un chemin interne « sûr » : commence par un seul `/` (jamais `//…`, que le
 * navigateur résout comme une URL vers un autre host), ne contient pas
 * `://` (protocole explicite, ex. `javascript:`, `https://`), et ne contient
 * aucun antislash — les navigateurs normalisent `\` en `/` dans la partie
 * chemin d'une URL http/https (WHATWG URL living standard), donc
 * `/\evil.tld` ou `/\/evil.tld` se résolvent en `https://evil.tld/` au
 * moment de la navigation alors même qu'ils passent les deux contrôles
 * ci-dessus. Aucune route Next interne légitime de cette app ne contient
 * d'antislash : l'exclusion totale est sans coût fonctionnel.
 */
export function isSafeReturnPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  if (path.includes("\\")) return false;
  return true;
}

/**
 * Lit `?returnTo=` depuis les query params de /connexion ou /inscription —
 * retombe sur `/dashboard` si absent ou dangereux (voir {@link isSafeReturnPath}).
 */
export function resolveReturnTo(searchParams: ReadonlySearchParams): string {
  const raw = searchParams.get(RETURN_TO_PARAM);
  return isSafeReturnPath(raw) ? raw : DEFAULT_RETURN_TO;
}

/**
 * Construit `/connexion?returnTo=<path>` — utilisé par les actions qui
 * exigent une session (ajout à la demande, contact vendeur, signalement…)
 * depuis une page publique, pour ramener le visiteur là où il était une fois
 * connecté. `returnTo` non fourni ou dangereux : lien nu vers /connexion, la
 * même redirection par défaut que {@link resolveReturnTo}.
 */
export function buildLoginHref(returnTo?: string | null): string {
  if (!isSafeReturnPath(returnTo)) return "/connexion";
  return `/connexion?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`;
}

/** Équivalent de {@link buildLoginHref} pour /inscription (CTA « Créer un compte » depuis une page publique). */
export function buildInscriptionHref(returnTo?: string | null): string {
  if (!isSafeReturnPath(returnTo)) return "/inscription";
  return `/inscription?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`;
}
