/**
 * Types alignés sur le contrat backend (lecture seule, T39) :
 * `GET /vendeurs` (liste publique paginée) et `GET /vendeurs/:id` (profil
 * public). Mêmes conventions que src/lib/products/types.ts et
 * src/lib/categories/types.ts.
 */

import type { ProductSearchItem, StatutVendeur } from "@/lib/products/types";
import type { VendeurReviewItem } from "@/lib/reviews/types";

/**
 * Élément de `GET /vendeurs` — jamais de téléphone dans cette liste (règle
 * de confidentialité du contrat : une liste de numéros ne doit pas être
 * aspirable). Vendeurs suspendus déjà exclus côté backend.
 */
export interface VendorListItem {
  id: string;
  nom: string;
  statutVendeur: StatutVendeur;
  noteMoyenne: number | null;
  nbAvis: number;
  nbProduitsActifs: number;
}

export interface VendorSearchResult {
  items: VendorListItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * `GET /vendeurs/:id` — profil public. `telephone` n'est renseigné que si la
 * requête est authentifiée (`null` pour un visiteur anonyme, cf. contrat).
 * `produits` reprend la forme des items de recherche produit (réutilisable
 * tel quel par `ProductCard`, src/components/products/ProductCard.tsx).
 * `avis` n'est pas consommé directement par la fiche vendeur : celle-ci
 * réutilise `VendorReviewsSection` (src/components/reviews/), qui pagine via
 * le endpoint dédié `GET /vendeurs/:id/avis` — ce champ reste dans le type
 * pour la fidélité au contrat.
 */
export interface VendorDetail extends VendorListItem {
  telephone: string | null;
  produits: ProductSearchItem[];
  avis: VendeurReviewItem[];
}
