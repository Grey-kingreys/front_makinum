"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useGeolocation, type UseGeolocationResult } from "./useGeolocation";

/**
 * Partage un unique état de géolocalisation entre la sidebar (pastille
 * position) et les pages acheteur (/produits, fiche produit) — sans lui, une
 * position acquise sur /produits n'atteindrait pas la sidebar (deux instances
 * de hook indépendantes ne se synchronisent pas). Monté une fois dans
 * AppShell, au-dessus de la sidebar et du contenu de page.
 */
const GeoContext = createContext<UseGeolocationResult | null>(null);

export function GeoProvider({ children }: { children: ReactNode }) {
  const geo = useGeolocation();
  return <GeoContext.Provider value={geo}>{children}</GeoContext.Provider>;
}

export function useGeo(): UseGeolocationResult {
  const ctx = useContext(GeoContext);
  if (!ctx) {
    throw new Error("useGeo doit être utilisé à l'intérieur d'un <GeoProvider>.");
  }
  return ctx;
}
