import { apiFetch } from "@/lib/api";

import type { VendorDetail, VendorSearchResult } from "./types";

export interface ListVendorsParams {
  page?: number;
  limit?: number;
}

function buildListVendorsQuery(params: ListVendorsParams): string {
  const usp = new URLSearchParams();
  if (params.page !== undefined) usp.set("page", String(params.page));
  if (params.limit !== undefined) usp.set("limit", String(params.limit));
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/** GET /vendeurs — liste publique paginée (mêmes conventions que GET /products). */
export function listVendors(params: ListVendorsParams = {}): Promise<VendorSearchResult> {
  return apiFetch<VendorSearchResult>(`/vendeurs${buildListVendorsQuery(params)}`, { method: "GET" });
}

/**
 * GET /vendeurs/:id — profil public. `apiFetch` injecte déjà le Bearer token
 * présent (src/lib/api.ts) : le backend décide seul, selon l'authentification
 * de la requête, de renseigner `telephone` ou de le renvoyer à `null`.
 * Vendeur inexistant ou suspendu → 404 (`VENDOR_NOT_FOUND`).
 */
export function getVendor(id: string): Promise<VendorDetail> {
  return apiFetch<VendorDetail>(`/vendeurs/${encodeURIComponent(id)}`, { method: "GET" });
}
