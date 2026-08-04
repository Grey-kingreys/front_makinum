import { apiFetch } from "@/lib/api";

import type { ReviewView, VendeurReviewsResult } from "./types";

/**
 * Wrappers du module avis — endpoints de
 * backend/src/reviews/reviews.controller.ts (lecture seule).
 */

export interface CreateReviewInput {
  purchaseRequestId: string;
  /** Entier 1 à 5 (CDC §6). */
  note: number;
  /** Optionnel, max 1000 caractères côté backend. */
  commentaire?: string;
}

/**
 * POST /avis — réservé aux appelants authentifiés (l'appartenance à la
 * demande fait le reste, côté backend). Peut échouer avec REQUEST_NOT_CLOSED
 * ou REVIEW_ALREADY_EXISTS (409) — voir describeReviewError.
 */
export function createReview(input: CreateReviewInput): Promise<ReviewView> {
  return apiFetch<ReviewView>("/avis", { method: "POST", body: input });
}

export interface ListVendeurReviewsParams {
  page?: number;
  limit?: number;
}

function buildVendeurReviewsQuery(params: ListVendeurReviewsParams): string {
  const usp = new URLSearchParams();
  if (params.page !== undefined) usp.set("page", String(params.page));
  if (params.limit !== undefined) usp.set("limit", String(params.limit));
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/** GET /vendeurs/:id/avis — listing public paginé, aucune authentification requise. */
export function listVendeurReviews(
  vendeurId: string,
  params: ListVendeurReviewsParams = {},
): Promise<VendeurReviewsResult> {
  return apiFetch<VendeurReviewsResult>(
    `/vendeurs/${encodeURIComponent(vendeurId)}/avis${buildVendeurReviewsQuery(params)}`,
    { method: "GET" },
  );
}
