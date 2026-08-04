import { apiFetch } from "@/lib/api";

import type { PurchaseRequestView } from "./types";

/**
 * Wrappers acheteur — endpoints authentifiés de
 * backend/src/purchase-requests/purchase-requests.controller.ts (lecture
 * seule). `cloturer` (réservé au vendeur) n'est pas exposé ici : hors du
 * périmètre acheteur de « Ma demande d'achat » (T16), il sera ajouté par
 * l'espace vendeur « demandes reçues » (T17b).
 */

export interface CreatePurchaseRequestInput {
  produitId: string;
  /** Défaut serveur : 1. */
  quantite?: number;
}

export interface AddPurchaseRequestItemInput {
  produitId: string;
  quantite: number;
}

/**
 * POST /demandes — crée le brouillon du vendeur du produit, ou complète (par
 * incrémentation) le brouillon existant pour ce couple acheteur↔vendeur.
 */
export function createOrCompletePurchaseRequest(
  input: CreatePurchaseRequestInput,
): Promise<PurchaseRequestView> {
  return apiFetch<PurchaseRequestView>("/demandes", { method: "POST", body: input });
}

/**
 * POST /demandes/:id/items — ajoute (ou incrémente si déjà présente) une
 * ligne sur MON brouillon EN_COURS.
 */
export function addPurchaseRequestItem(
  demandeId: string,
  input: AddPurchaseRequestItemInput,
): Promise<PurchaseRequestView> {
  return apiFetch<PurchaseRequestView>(
    `/demandes/${encodeURIComponent(demandeId)}/items`,
    { method: "POST", body: input },
  );
}

/**
 * DELETE /demandes/:id/items/:produitId — `demande: null` si c'était la
 * dernière ligne : le brouillon disparaît côté serveur.
 */
export function removePurchaseRequestItem(
  demandeId: string,
  produitId: string,
): Promise<{ demande: PurchaseRequestView | null }> {
  return apiFetch<{ demande: PurchaseRequestView | null }>(
    `/demandes/${encodeURIComponent(demandeId)}/items/${encodeURIComponent(produitId)}`,
    { method: "DELETE" },
  );
}

/**
 * GET /demandes — mes demandes : côté acheteur tous statuts, côté vendeur
 * uniquement les demandes reçues ENVOYEE/CLOTUREE (fusionnées par le
 * backend).
 */
export function listPurchaseRequests(): Promise<PurchaseRequestView[]> {
  return apiFetch<PurchaseRequestView[]>("/demandes", { method: "GET" });
}

/** GET /demandes/:id — parties concernées seulement (404 sinon). */
export function getPurchaseRequest(id: string): Promise<PurchaseRequestView> {
  return apiFetch<PurchaseRequestView>(`/demandes/${encodeURIComponent(id)}`, { method: "GET" });
}

/** POST /demandes/:id/envoyer */
export function sendPurchaseRequest(id: string): Promise<PurchaseRequestView> {
  return apiFetch<PurchaseRequestView>(`/demandes/${encodeURIComponent(id)}/envoyer`, {
    method: "POST",
  });
}

/** POST /demandes/:id/annuler */
export function cancelPurchaseRequest(id: string): Promise<PurchaseRequestView> {
  return apiFetch<PurchaseRequestView>(`/demandes/${encodeURIComponent(id)}/annuler`, {
    method: "POST",
  });
}
