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
