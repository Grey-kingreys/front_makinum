import type { MetadataRoute } from "next";

import { searchProducts } from "@/lib/products/api";
import { getSiteUrl } from "@/lib/seo/config";
import { listVendors } from "@/lib/vendors/api";

/** Plafond serveur de `GET /products` et `GET /vendeurs` (T53, RECHERCHE_LIMIT_MAX / VENDEURS_LIMIT_MAX = 50 côté backend). */
const PAGE_LIMIT = 50;

/**
 * Borne de sécurité sur le nombre de pages parcourues par type de fiche :
 * 200 × 50 = 10 000 fiches, largement au-dessus du catalogue réel de
 * Conakry — évite une boucle infinie si `total` mentait ou si l'API
 * renvoyait indéfiniment des pages pleines.
 */
const MAX_PAGES = 200;

const STATIC_PATHS = ["/", "/produits", "/vendeurs", "/cgu", "/confidentialite"];

/**
 * Sans ça, `sitemap.xml` est un Route Handler mis en cache "à vie" (jusqu'au
 * prochain build/déploiement) — cf. node_modules/next/dist/docs/.../sitemap.md
 * ("cached by default unless it uses a Request-time API or dynamic config
 * option"). Ce sitemap étant le seul chemin de découverte fiable des fiches
 * produit/vendeur (voir plus bas), le figer jusqu'au prochain redéploiement
 * viderait ④ de son sens : les nouvelles annonces resteraient invisibles de
 * Google entre deux déploiements. Une heure suffit largement (Google ne
 * re-crawle pas un sitemap en continu).
 */
export const revalidate = 3600;

async function collectAllIds<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; total: number }>,
  getId: (item: T) => string,
): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await fetchPage(page);
    ids.push(...result.items.map(getId));
    if (result.items.length < PAGE_LIMIT || ids.length >= result.total) break;
  }
  return ids;
}

/**
 * Sitemap (T53) : les fiches produit/vendeur ne portent aucune date exposée
 * par l'API (`ProductSearchItem`/`VendorListItem` vérifiés — pas de champ
 * date) — pas de `lastModified` ici, on ne l'invente pas.
 *
 * `/produits` et `/vendeurs` sont des pages `○ Static` qui se remplissent
 * côté client (filtrage géolocalisé volontairement client-only) : ce sitemap
 * est donc le seul chemin de découverte fiable des fiches individuelles pour
 * Google, pas un simple bonus.
 *
 * Résilience obligatoire : si l'API est injoignable ou renvoie une erreur,
 * on renvoie quand même les entrées statiques plutôt que de faire échouer la
 * route (un sitemap partiel vaut mieux qu'une 500 sur /sitemap.xml).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${siteUrl}${path}`,
  }));

  try {
    const [productIds, vendorIds] = await Promise.all([
      collectAllIds(
        (page) => searchProducts({ page, limit: PAGE_LIMIT }),
        (item) => item.id,
      ),
      collectAllIds(
        (page) => listVendors({ page, limit: PAGE_LIMIT }),
        (item) => item.id,
      ),
    ]);

    return [
      ...staticEntries,
      ...productIds.map((id) => ({ url: `${siteUrl}/produits/${id}` })),
      ...vendorIds.map((id) => ({ url: `${siteUrl}/vendeurs/${id}` })),
    ];
  } catch {
    return staticEntries;
  }
}
