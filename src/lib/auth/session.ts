/**
 * État de session côté client — T28.
 *
 * Le jeton d'accès (10 minutes) ne quitte jamais la mémoire du document :
 * aucun stockage persistant du navigateur, aucun cookie lisible par
 * JavaScript. Un rechargement de page le perd volontairement ; la session est
 * reconstruite via `POST /auth/refresh`, authentifié par le seul cookie
 * httpOnly `makinum_refresh` posé par le backend (invisible pour JS, envoyé
 * automatiquement grâce à `credentials: "include"`).
 *
 * Module volontairement sans dépendance runtime (imports de types
 * uniquement) : `src/lib/api.ts` peut l'importer sans créer de cycle.
 */

import type { LoginResponse } from "./types";

let accessToken: string | null = null;

/**
 * Rafraîchissement en vol, partagé par tous les appelants — la « file
 * d'attente » à une place de {@link singleFlightRefresh}.
 */
let pendingRefresh: Promise<LoginResponse> | null = null;

type SessionExpiredListener = () => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Mémorise le jeton d'accès — sans effet hors navigateur : côté serveur, ce
 * module est un singleton partagé par toutes les requêtes entrantes, y
 * stocker un jeton le ferait fuiter d'un utilisateur à l'autre.
 */
export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

/**
 * Sérialise les rafraîchissements : tant qu'un `POST /auth/refresh` est en
 * vol, tout nouvel appelant reçoit **la même** promesse au lieu d'en
 * déclencher un second.
 *
 * Ce n'est pas une simple optimisation. Le backend fait tourner le jeton de
 * rafraîchissement à chaque appel : deux `POST /auth/refresh` concurrents
 * présenteraient le même jeton, et le second serait interprété comme une
 * réutilisation frauduleuse — ce qui révoque toute la session de
 * l'utilisateur. Or l'application lance plusieurs requêtes en parallèle
 * (providers montés dans le même commit), qui expirent donc ensemble.
 */
export function singleFlightRefresh(
  start: () => Promise<LoginResponse>,
): Promise<LoginResponse> {
  if (pendingRefresh) return pendingRefresh;

  const attempt = start();
  pendingRefresh = attempt;
  const release = () => {
    if (pendingRefresh === attempt) pendingRefresh = null;
  };
  // `then(release, release)` plutôt que `finally` : la promesse dérivée est
  // toujours tenue, donc pas de rejet non géré si `attempt` échoue.
  attempt.then(release, release);

  return attempt;
}

/**
 * S'abonne à la perte de session (rafraîchissement refusé). Renvoie la
 * fonction de désabonnement, directement utilisable en nettoyage d'effet.
 */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export function notifySessionExpired(): void {
  for (const listener of [...sessionExpiredListeners]) {
    listener();
  }
}

/** Remise à zéro complète de l'état de module — utilisée par les tests. */
export function resetSession(): void {
  accessToken = null;
  pendingRefresh = null;
}
