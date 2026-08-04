import { apiFetch } from "@/lib/api";

import type { ActionAdmin, ReportListResult, ReportView, StatutSignalement } from "./types";

/**
 * Wrappers du module signalements — endpoints de
 * backend/src/reports/reports.controller.ts et admin-reports.controller.ts
 * (lecture seule).
 */

export interface CreateReportInput {
  utilisateurCibleId: string;
  /** Rattache le signalement à un produit précis de la cible. */
  produitId?: string;
  /** 5 à 500 caractères — voir MOTIF_MIN_LENGTH/MOTIF_MAX_LENGTH. */
  motif: string;
}

/**
 * POST /signalements — réservé aux appelants authentifiés. Peut échouer avec
 * CANNOT_REPORT_SELF, REPORT_TARGET_NOT_FOUND ou PRODUCT_NOT_TARGET_OWNER
 * (voir describeReportError).
 */
export function createReport(input: CreateReportInput): Promise<ReportView> {
  return apiFetch<ReportView>("/signalements", { method: "POST", body: input });
}

export interface ListReportsParams {
  statut?: StatutSignalement;
  page?: number;
  limit?: number;
}

function buildReportsQuery(params: ListReportsParams): string {
  const usp = new URLSearchParams();
  if (params.statut !== undefined) usp.set("statut", params.statut);
  if (params.page !== undefined) usp.set("page", String(params.page));
  if (params.limit !== undefined) usp.set("limit", String(params.limit));
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/** GET /admin/signalements — réservé ADMIN. Filtre optionnel par statut, pagination. */
export function listReports(params: ListReportsParams = {}): Promise<ReportListResult> {
  return apiFetch<ReportListResult>(`/admin/signalements${buildReportsQuery(params)}`, {
    method: "GET",
  });
}

export interface UpdateReportInput {
  /** Seules EN_EXAMEN et TRAITE sont des cibles atteignables via PATCH. */
  statut: Extract<StatutSignalement, "EN_EXAMEN" | "TRAITE">;
  /** N'a d'effet (et n'est accepté) qu'accompagné de `statut: "TRAITE"`. */
  actionAdmin?: ActionAdmin;
}

/**
 * PATCH /admin/signalements/:id — réservé ADMIN. Peut échouer avec
 * REPORT_ALREADY_TREATED (409), ACTION_REQUIRES_TREATED_STATUS ou
 * DEACTIVATION_REQUIRES_PRODUCT (400) — voir describeReportError.
 */
export function updateReport(id: string, input: UpdateReportInput): Promise<ReportView> {
  return apiFetch<ReportView>(`/admin/signalements/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}
