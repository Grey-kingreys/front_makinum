"use client";

import { useCallback, useState } from "react";

import { readStoredPosition, writeStoredPosition } from "./storage";
import type { GeoPosition, GeoStatus } from "./types";

export interface UseGeolocationResult {
  status: GeoStatus;
  position: GeoPosition | null;
  /** Déclenche (ou relance) la demande de position au navigateur. */
  request: () => void;
}

interface GeoState {
  status: GeoStatus;
  position: GeoPosition | null;
}

function initialState(): GeoState {
  const stored = readStoredPosition();
  return { status: stored ? "granted" : "idle", position: stored };
}

/**
 * Hook géoloc bas niveau : encapsule `navigator.geolocation`, mémorise la
 * position acquise en sessionStorage (survit à la navigation intra-session,
 * pas au-delà) et expose un état simple idle/asking/granted/denied. Ne
 * déclenche jamais de demande automatiquement — c'est à l'appelant (page
 * /produits) de décider quand solliciter le navigateur.
 */
export function useGeolocation(): UseGeolocationResult {
  const [state, setState] = useState<GeoState>(initialState);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((prev) => ({ ...prev, status: "denied" }));
      return;
    }

    setState((prev) => ({ ...prev, status: "asking" }));
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const next: GeoPosition = { lat: result.coords.latitude, lng: result.coords.longitude };
        writeStoredPosition(next);
        setState({ status: "granted", position: next });
      },
      () => {
        setState((prev) => ({ ...prev, status: "denied" }));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  return { status: state.status, position: state.position, request };
}
