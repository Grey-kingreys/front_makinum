import type { GeoPosition } from "./types";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Distance à vol d'oiseau entre deux points (formule de haversine), en km.
 * Utilisé côté client pour la fiche produit — le backend ne renvoie
 * `distanceKm` que sur la recherche (GET /products), pas sur GET /products/:id.
 */
export function haversineDistanceKm(a: GeoPosition, b: GeoPosition): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/** Arrondi à 0,1 km — même convention d'affichage que le backend (arrondirDistanceKm). */
export function roundDistanceKm(km: number): number {
  return Math.round(km * 10) / 10;
}
