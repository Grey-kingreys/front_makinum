import { apiFetch } from "@/lib/api";
import type { Role, StatutCompte, StatutVendeur } from "@/lib/auth/types";

import type { AdminUserListResult, AdminUserView } from "./types";

/**
 * Wrappers du module admin/utilisateurs — endpoints de
 * backend/src/reports/admin-users.controller.ts (lecture seule), réservés
 * ADMIN.
 */

export interface ListAdminUsersParams {
  role?: Role;
  statutCompte?: StatutCompte;
  statutVendeur?: StatutVendeur;
  /** Vendeurs en attente de validation admin (T30) : `false` = pas encore validés. */
  vendeurValide?: boolean;
  /** Recherche insensible à la casse sur le nom ou le téléphone. */
  q?: string;
  page?: number;
  limit?: number;
}

function buildAdminUsersQuery(params: ListAdminUsersParams): string {
  const usp = new URLSearchParams();
  if (params.role !== undefined) usp.set("role", params.role);
  if (params.statutCompte !== undefined) usp.set("statutCompte", params.statutCompte);
  if (params.statutVendeur !== undefined) usp.set("statutVendeur", params.statutVendeur);
  if (params.vendeurValide !== undefined) usp.set("vendeurValide", String(params.vendeurValide));
  if (params.q !== undefined && params.q.trim()) usp.set("q", params.q.trim());
  if (params.page !== undefined) usp.set("page", String(params.page));
  if (params.limit !== undefined) usp.set("limit", String(params.limit));
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/** GET /admin/utilisateurs — pagination, filtres rôle/statut, recherche nom/téléphone. */
export function listAdminUsers(
  params: ListAdminUsersParams = {},
): Promise<AdminUserListResult> {
  return apiFetch<AdminUserListResult>(`/admin/utilisateurs${buildAdminUsersQuery(params)}`, {
    method: "GET",
  });
}

export interface UpdateAdminUserInput {
  /** Attribution manuelle du niveau de confiance (LIBRE/VERIFIE/CONFIANCE). */
  statutVendeur?: StatutVendeur;
  /**
   * SUSPENDU déclenche la cascade de suspension (compte + tout le catalogue
   * désactivé) ; ACTIF réactive le compte seul, les produits restent
   * désactivés.
   */
  statutCompte?: StatutCompte;
  /**
   * Validation admin du compte vendeur (T30) : passage à `true` débloque la
   * publication de produits côté vendeur et déclenche une notification
   * (VENDEUR_VALIDE). Le retour à `false` n'est pas exposé côté écran admin
   * (pas de cas d'usage V1).
   */
  vendeurValide?: boolean;
}

/**
 * PATCH /admin/utilisateurs/:id — peut échouer avec USER_NOT_FOUND (404) ou
 * CANNOT_SUSPEND_SELF (400) — voir describeAdminUserError.
 */
export function updateAdminUser(
  id: string,
  input: UpdateAdminUserInput,
): Promise<AdminUserView> {
  return apiFetch<AdminUserView>(`/admin/utilisateurs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}
