// Service worker Makinum (T67①) — écrit à la main, sans dépendance (le
// build de production tourne sous Turbopack : les plugins webpack type
// @serwist/next ne sont pas une option, voir
// node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md,
// section « Extending your PWA »).
//
// Portée volontairement minimale : precache de la coquille hors-ligne et du
// strict nécessaire à l'installabilité, network-first sur les navigations
// avec repli sur /hors-ligne, cache-first sur les assets statiques
// immuables. Tout le reste (en particulier l'API backend et toute requête
// non-GET) traverse le service worker sans jamais être intercepté ni mis en
// cache — voir les commentaires dans l'écouteur `fetch` ci-dessous.

const CACHE_VERSION = "makinum-v1";

// Ressources precachées à l'installation : la page de repli hors-ligne, le
// manifeste PWA et les icônes servies depuis /icons — tout ce qu'il faut
// pour qu'une navigation coupée du réseau retombe sur un écran cohérent
// plutôt que la page d'erreur générique du navigateur.
const PRECACHE_URLS = [
  "/hors-ligne",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Active la nouvelle version immédiatement (n'attend pas la fermeture
      // de tous les onglets ouverts sur l'ancienne) : combiné à
      // `clients.claim()` dans `activate`, une mise à jour du service
      // worker prend effet dès le prochain rechargement.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // Purge des caches d'anciennes versions (ex. makinum-v0) : évite
      // d'accumuler indéfiniment des ressources obsolètes dans le stockage
      // du navigateur à chaque déploiement.
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // EXCLUSION 1 — jamais de requête non-GET dans le cache : POST/PUT/PATCH/
  // DELETE sont toutes des mutations (connexion, publication produit, envoi
  // de demande, etc.) ; les mettre en cache ou les rejouer depuis le cache
  // serait incorrect et dangereux. On ne les intercepte pas : elles
  // atteignent le réseau normalement, sans passer par ce service worker.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // EXCLUSION 2 — jamais de requête cross-origin dans le cache : en
  // particulier l'API backend, servie depuis NEXT_PUBLIC_API_URL (une autre
  // origine que le frontend, cf. src/lib/api.ts). Ce service worker ne gère
  // que les ressources de sa propre origine (pages Next, assets statiques,
  // manifeste, icônes) ; toute requête vers une autre origine — dont
  // *toutes* les requêtes API — ressort de cette condition et n'est donc
  // jamais interceptée ni mise en cache.
  if (url.origin !== self.location.origin) return;

  // Navigations (chargement de page / changement d'URL) : network-first —
  // on veut toujours le HTML le plus frais quand le réseau répond ; le
  // repli sur le cache ne joue que si `fetch` échoue réellement (coupure
  // réseau), auquel cas on sert la page hors-ligne precachée plutôt que la
  // page d'erreur native du navigateur.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/hors-ligne").then((cached) => cached || Response.error())),
    );
    return;
  }

  // Assets statiques immuables (bundles Next hashés, icônes) : cache-first,
  // le réseau ne sert qu'à peupler le cache la première fois qu'une
  // ressource est demandée.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copie = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copie));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Tout le reste (pages non-navigation type prefetch, data Next, requêtes
  // GET diverses non couvertes ci-dessus) : aucune interception. En
  // n'appelant pas `event.respondWith`, la requête suit son chemin réseau
  // normal, sans jamais transiter par ce service worker ni son cache — ce
  // qui inclut, par construction des deux exclusions ci-dessus, toute
  // requête vers l'API et toute requête non-GET.
});
