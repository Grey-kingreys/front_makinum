/**
 * Types alignés sur le contrat backend (lecture seule) :
 * backend/src/products/products.types.ts, dto/search-products.dto.ts.
 *
 * `ProductVendeurView` porte deux champs optionnels que l'API n'expose pas
 * encore aujourd'hui — `telephone` (évolution T9 : un acheteur connecté
 * verrait le numéro du vendeur) et `noteMoyenne`/`nbAvis` sur la fiche
 * détaillée (GET /products/:id ne les renvoie pas, seule la recherche les
 * expose via `ProductSearchVendeurView`). Les garder optionnels ici rend le
 * code de la fiche produit prêt pour ces évolutions sans deviner leur forme.
 */

export type StatutVendeur = "LIBRE" | "VERIFIE" | "CONFIANCE";

export interface ProductPhotoView {
  id: string;
  url: string;
  urlMiniature: string;
  ordre: number;
}

export interface ProductCategorieView {
  id: string;
  nom: string;
  slug: string;
}

export interface ProductVendeurView {
  id: string;
  nom: string;
  statutVendeur: StatutVendeur;
  /** Non exposé par l'API V1 — prêt pour une évolution future (T9). */
  telephone?: string;
  /** Non exposé par GET /products/:id aujourd'hui — prêt si l'API l'ajoute. */
  noteMoyenne?: number | null;
  nbAvis?: number;
}

/** Auteur d'un avis produit — mêmes champs que `ReviewAuteurView` côté backend. */
export interface ProductAvisAuteurView {
  nom: string;
}

/** Un avis lié à ce produit précisément (backend/src/products/products.types.ts, `ProductAvisItem`). */
export interface ProductAvisItemView {
  note: number;
  commentaire: string | null;
  dateCreation: string;
  auteur: ProductAvisAuteurView;
}

/**
 * Agrégat d'avis d'un produit (T72a, backend `ProductAvisResume`) — consommé
 * par le JSON-LD `aggregateRating`/`review` de la fiche produit (T72b).
 */
export interface ProductAvisResumeView {
  /** Moyenne arrondie à 0,1 ; `null` sans avis. */
  noteMoyenne: number | null;
  nbAvis: number;
  /** Les avis les plus récents (3 au plus, dateCreation desc). */
  items: ProductAvisItemView[];
}

export interface ProductView {
  id: string;
  titre: string;
  description: string;
  /** Décimal exact rendu en chaîne — voir formatPrixGNF pour l'affichage. */
  prix: string;
  categorieId: string;
  vendeurId: string;
  latitude: number | null;
  longitude: number | null;
  actif: boolean;
  dateCreation: string;
  dateMiseAJour: string;
  categorie: ProductCategorieView;
  vendeur: ProductVendeurView;
  photos: ProductPhotoView[];
  /**
   * Optionnel : le backend le renvoie toujours sur `GET /products/:id`
   * (T72a) mais il est absent des autres vues `ProductView` (catalogue
   * vendeur…) qui partagent ce même type — se garder par présence à l'usage.
   */
  avisProduit?: ProductAvisResumeView;
}

export interface ProductSearchCategorieView {
  nom: string;
  slug: string;
}

export interface ProductSearchVendeurView {
  id: string;
  nom: string;
  statutVendeur: StatutVendeur;
  noteMoyenne: number | null;
  nbAvis: number;
}

export interface ProductSearchItem {
  id: string;
  titre: string;
  prix: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  miniature: string | null;
  categorie: ProductSearchCategorieView;
  vendeur: ProductSearchVendeurView;
}

export interface ProductSearchResult {
  items: ProductSearchItem[];
  total: number;
  page: number;
  limit: number;
}

/** `TriProduits` (backend/src/products/dto/search-products.dto.ts). */
export type TriProduits = "proche" | "prix_asc" | "prix_desc" | "recent";
