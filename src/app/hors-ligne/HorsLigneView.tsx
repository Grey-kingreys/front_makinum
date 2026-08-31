"use client";

import { WifiOff } from "lucide-react";

/**
 * Contenu interactif de /hors-ligne (T67①) — extrait de page.tsx pour
 * pouvoir déclencher `window.location.reload()` au clic (Server Components
 * ne peuvent pas porter de gestionnaire d'événement) sans empêcher page.tsx
 * d'exporter `metadata`, réservé aux Server Components.
 *
 * Aucun appel réseau au rendu : entièrement autonome, précachée par
 * `public/sw.js` (voir PRECACHE_URLS) pour rester servable quand le réseau
 * est coupé — c'est le repli de la stratégie network-first sur les
 * navigations (voir le commentaire du service worker).
 */
export function HorsLigneView() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center px-6 py-24 text-center">
      <span
        aria-hidden="true"
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-tint-danger text-danger"
      >
        <WifiOff className="h-7 w-7" />
      </span>

      <h1 className="mb-3 font-display text-[24px] font-bold text-ink">Pas de connexion</h1>
      <p className="mb-8 text-[14.5px] leading-relaxed text-brand-subtle">
        Vérifie ton réseau et réessaie. Les pages déjà visitées peuvent rester consultables, mais rien de
        nouveau ne peut se charger tant que la connexion n&apos;est pas revenue.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 text-[14.5px] font-semibold text-cream transition-colors hover:bg-brand-vivid"
      >
        Réessayer
      </button>
    </div>
  );
}
