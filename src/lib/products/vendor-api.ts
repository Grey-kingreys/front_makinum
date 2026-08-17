import { apiFetch } from "@/lib/api";

import type { ProductPhotoView, ProductView } from "./types";

/**
 * Wrappers vendeur — endpoints authentifiés VENDEUR de
 * backend/src/products/products.controller.ts (lecture seule). Complète
 * src/lib/products/api.ts (recherche/fiche publiques, T15).
 */

/** Limite de produits **actifs** par vendeur (backend/src/products/products.types.ts). */
export const MAX_PRODUITS_ACTIFS = 30;

/** Limite de photos par produit (backend/src/products/products.types.ts). */
export const MAX_PHOTOS_PAR_PRODUIT = 10;

export interface ProductInput {
  titre: string;
  description: string;
  prix: number;
  categorieId: string;
  latitude?: number;
  longitude?: number;
}

/** PATCH /products/:id : tous les champs optionnels, + `actif` (dé/réactivation). */
export interface ProductUpdateInput extends Partial<ProductInput> {
  actif?: boolean;
}

/** GET /products/mine — catalogue du vendeur connecté (produits actifs et inactifs). */
export function getMyProducts(): Promise<ProductView[]> {
  return apiFetch<ProductView[]>("/products/mine", { method: "GET" });
}

/** POST /products */
export function createProduct(input: ProductInput): Promise<ProductView> {
  return apiFetch<ProductView>("/products", { method: "POST", body: input });
}

/** PATCH /products/:id — modification des champs et/ou dé/réactivation (`actif`). */
export function updateProduct(id: string, input: ProductUpdateInput): Promise<ProductView> {
  return apiFetch<ProductView>(`/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

/**
 * POST /products/:id/photos — multipart, champ « photo ». `apiFetch` transmet
 * un `FormData` tel quel (src/lib/api.ts) : ne jamais poser de Content-Type
 * ici, le navigateur doit fixer lui-même le `boundary` multipart.
 */
export function addProductPhoto(id: string, file: File): Promise<ProductPhotoView> {
  const formData = new FormData();
  formData.append("photo", file);
  return apiFetch<ProductPhotoView>(`/products/${encodeURIComponent(id)}/photos`, {
    method: "POST",
    body: formData,
  });
}

/** DELETE /products/:id/photos/:photoId — 204 No Content. */
export function deleteProductPhoto(id: string, photoId: string): Promise<void> {
  return apiFetch<void>(
    `/products/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE" },
  );
}

/** PATCH /products/:id/photos/order — liste complète des photos dans l'ordre voulu. */
export function reorderProductPhotos(id: string, photoIds: string[]): Promise<ProductPhotoView[]> {
  return apiFetch<ProductPhotoView[]>(`/products/${encodeURIComponent(id)}/photos/order`, {
    method: "PATCH",
    body: { photoIds },
  });
}

/**
 * DELETE /products/:id — 204 No Content. Suppression réelle et irréversible
 * (produit + photos + fichiers de stockage). Refusée (409 PRODUCT_HAS_HISTORY)
 * si le produit a un historique (demandes, avis ou signalements) : désactiver
 * plutôt via `updateProduct(id, { actif: false })`.
 */
export function deleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
}
