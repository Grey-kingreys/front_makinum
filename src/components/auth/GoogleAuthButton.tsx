import { getApiBaseUrl } from "@/lib/api";

/**
 * Bouton « Continuer avec Google » (T29) — /connexion et /inscription.
 *
 * Un simple lien `<a href>` vers `GET /auth/google`, **jamais** un `fetch` :
 * cet endpoint répond une redirection 302 vers l'écran de consentement
 * Google, sur un autre domaine — une requête AJAX ne peut pas suivre ce
 * genre de redirection (et le CORS la bloquerait de toute façon). L'URL
 * réutilise la même base que `apiFetch` (`getApiBaseUrl`), jamais codée en
 * dur, pour rester valide en dev comme en prod.
 *
 * Si Google OAuth n'est pas configuré côté serveur, le backend répond
 * `503 { code: "GOOGLE_OAUTH_DISABLED" }` — comme on y arrive par navigation
 * pleine page, l'utilisateur verrait alors la page d'erreur brute de l'API.
 * Aucun moyen de détecter cette indisponibilité à l'avance (pas d'endpoint
 * pour ça) : le bouton est donc toujours affiché.
 */
export function GoogleAuthButton() {
  const href = `${getApiBaseUrl()}/auth/google`;

  return (
    <div>
      <a
        href={href}
        className="flex w-full items-center justify-center gap-2.5 rounded-md border border-border-strong bg-white px-5 py-3.5 text-[15px] font-medium text-ink transition-colors hover:border-brand focus-visible:shadow-focus-brand"
      >
        <GoogleLogo />
        Continuer avec Google
      </a>

      <div className="my-5 flex items-center gap-3 text-[12.5px] text-brand-faint" role="presentation">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        ou
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

/** Logo Google officiel (quatre couleurs), inline — pas de dépendance ni d'image distante. */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px] shrink-0" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
