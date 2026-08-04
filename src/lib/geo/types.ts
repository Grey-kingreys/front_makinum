/**
 * États exposés par `useGeolocation` — repris tels quels par `GeoProvider` /
 * `useGeo`. `idle` : jamais demandée ; `asking` : prompt navigateur en
 * cours ; `granted`/`denied` : issue connue (refus, indisponibilité de
 * `navigator.geolocation`, ou timeout traités identiquement en `denied`).
 */
export type GeoStatus = "idle" | "asking" | "granted" | "denied";

export interface GeoPosition {
  lat: number;
  lng: number;
}
