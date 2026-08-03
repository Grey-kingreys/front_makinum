/**
 * Stockage du jeton de session — décision V1 actée : localStorage (pas de
 * cookie httpOnly). Isolé dans son propre module pour que src/lib/api.ts et
 * src/lib/auth/AuthProvider.tsx puissent tous deux y accéder sans dépendance
 * circulaire.
 */

const STORAGE_KEY = "makinum.accessToken";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getToken(): string | null {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Stockage indisponible (navigation privée stricte, quota, etc.) — on
    // ignore silencieusement, la session ne survivra simplement pas au reload.
  }
}

export function clearToken(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // idem
  }
}
