"use client";

import { useEffect } from "react";

/**
 * Enregistre `public/sw.js` (T67①), monté une seule fois dans le layout
 * racine. Ne rend rien : effet de bord pur au montage.
 *
 * Ne s'enregistre qu'en production (`NODE_ENV === "production"`) : en dev,
 * un service worker actif interceptant les navigations et cachant des
 * bundles `/​_next/static/*` gênerait le rechargement à chaud et servirait
 * de vieux assets après un simple refresh. Si un service worker résiduel
 * d'un précédent `npm run build && npm start` local traîne encore dans le
 * navigateur, on le désenregistre explicitement en dev pour ne pas polluer
 * les sessions de développement suivantes.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Échec d'enregistrement (navigateur non compatible, contexte non
        // sécurisé, etc.) : dégradation silencieuse — l'app reste utilisable
        // sans mode hors ligne ni invite d'installation, exactement comme
        // avant T67.
      });
      return;
    }

    // Hors production : aucun enregistrement, et on nettoie un éventuel
    // service worker déjà enregistré (ex. bascule dev après un test en
    // local du build de prod sur le même port).
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }, []);

  return null;
}
