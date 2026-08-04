import type { GeoPosition } from "./types";

/**
 * Position mémorisée en sessionStorage (pas localStorage) : une position
 * géographique n'a de sens que pour l'onglet/session en cours — contrairement
 * au jeton de session (src/lib/auth/token.ts) qui doit survivre au reload.
 */
const STORAGE_KEY = "makinum.position";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readStoredPosition(): GeoPosition | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GeoPosition> | null;
    if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return { lat: parsed.lat, lng: parsed.lng };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredPosition(position: GeoPosition): void {
  if (!hasStorage()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Quota dépassé / navigation privée stricte — la position ne survivra
    // simplement pas à la prochaine page, sans bloquer l'expérience.
  }
}
