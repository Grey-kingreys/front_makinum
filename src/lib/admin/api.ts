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
  /**
   * Conversion admin ACHETEUR → VENDEUR (T48b). `"VENDEUR"` est la SEULE
   * valeur acceptée par le backend (400 de validation class-validator sur
   * toute autre valeur, sans `code` — l'UI n'envoie jamais ADMIN/ACHETEUR
   * ici) — voir backend/src/reports/dto/update-user.dto.ts.
   */
  role?: "VENDEUR";
  /**
   * Téléphone de la cible, pris en compte uniquement avec `role: "VENDEUR"` —
   * requis seulement si la cible n'en a pas déjà un (400 PHONE_REQUIRED
   * sinon), ignoré si elle en a déjà un.
   */
  telephone?: string;
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
   * (VENDEUR_VALIDE). Combinable avec `role: "VENDEUR"` dans le même appel
   * (conversion + validation immédiate, T48b). Le retour à `false` n'est pas
   * exposé côté écran admin (pas de cas d'usage V1).
   */
  vendeurValide?: boolean;
}

/**
 * PATCH /admin/utilisateurs/:id — peut échouer avec USER_NOT_FOUND (404),
 * CANNOT_SUSPEND_SELF (400), ou — avec `role: "VENDEUR"` — PHONE_REQUIRED
 * (400), PHONE_ALREADY_USED (409), ALREADY_VENDOR (409), CANNOT_CONVERT_ADMIN
 * (400) — voir describeAdminUserError / describeConvertVendeurFormError.
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

/**
 * DELETE /admin/utilisateurs/:id (T49b) — 204 sans corps au succès (les
 * notifications du compte sont purgées et ses sessions révoquées côté
 * serveur ; `apiFetch` traite un 204 comme n'importe quelle réponse `ok`
 * sans corps, cf. `parseResponseBody`). Peut échouer avec USER_HAS_HISTORY
 * (409, le compte a au moins un produit, une demande, un avis ou un
 * signalement — à suspendre plutôt qu'à supprimer), CANNOT_DELETE_ADMIN
 * (400, cible admin — l'UI ne propose déjà pas l'action sur ces lignes) ou
 * USER_NOT_FOUND (404, supprimé entre le rendu et le clic) — voir
 * describeAdminUserError.
 */
export function deleteAdminUser(id: string): Promise<void> {
  return apiFetch<void>(`/admin/utilisateurs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
