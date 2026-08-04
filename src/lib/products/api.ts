import { apiFetch } from "@/lib/api";

import type { ProductSearchResult, ProductView, TriProduits } from "./types";

export interface SearchProductsParams {
  lat?: number;
  lng?: number;
  rayon?: number;
  categorie?: string;
  q?: string;
  tri?: TriProduits;
  page?: number;
  limit?: number;
}

function buildSearchQuery(params: SearchProductsParams): string {
  const usp = new URLSearchParams();
  if (params.lat !== undefined) usp.set("lat", String(params.lat));
  if (params.lng !== undefined) usp.set("lng", String(params.lng));
  if (params.rayon !== undefined) usp.set("rayon", String(params.rayon));
  if (params.categorie) usp.set("categorie", params.categorie);
  if (params.q) usp.set("q", params.q);
  if (params.tri) usp.set("tri", params.tri);
  if (params.page !== undefined) usp.set("page", String(params.page));
  if (params.limit !== undefined) usp.set("limit", String(params.limit));
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/** GET /products — recherche publique (CDC §6). */
export function searchProducts(params: SearchProductsParams = {}): Promise<ProductSearchResult> {
  return apiFetch<ProductSearchResult>(`/products${buildSearchQuery(params)}`, { method: "GET" });
}

/** GET /products/:id — fiche produit publique. */
export function getProduct(id: string): Promise<ProductView> {
  return apiFetch<ProductView>(`/products/${encodeURIComponent(id)}`, { method: "GET" });
}
