import { apiFetch } from "@/lib/api";

import type { PurchaseRequestView, ResultatDemande } from "./types";

/**
 * Wrappers authentifiés vers backend/src/purchase-requests/purchase-requests.controller.ts
 * (lecture seule) — acheteur (T16) et vendeur (T17b).
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
 * `vue` de `GET /demandes` (backend/src/purchase-requests/dto/list-purchase-requests.dto.ts,
 * `VueDemandes`) : `acheteur` renvoie mes demandes tous statuts, `vendeur`
 * les demandes reçues ENVOYEE/CLOTUREE uniquement.
 */
export type PurchaseRequestsVue = "acheteur" | "vendeur";

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
 * PATCH /demandes/:id/items/:produitId — fixe la quantité d'une ligne à une
 * valeur absolue (≥ 1), contrairement à `addPurchaseRequestItem` qui
 * additionne. Uniquement sur MON brouillon EN_COURS ; pour retirer une
 * ligne, `removePurchaseRequestItem` reste la voie.
 */
export function updatePurchaseRequestItemQuantity(
  demandeId: string,
  produitId: string,
  quantite: number,
): Promise<PurchaseRequestView> {
  return apiFetch<PurchaseRequestView>(
    `/demandes/${encodeURIComponent(demandeId)}/items/${encodeURIComponent(produitId)}`,
    { method: "PATCH", body: { quantite } },
  );
}

/**
 * GET /demandes?vue=… — `acheteur` : mes demandes tous statuts (/demandes,
 * DemandesProvider). `vendeur` : les demandes reçues ENVOYEE/CLOTUREE
 * (/vendeur/demandes, DemandesRecuesProvider).
 */
export function listPurchaseRequests(vue: PurchaseRequestsVue): Promise<PurchaseRequestView[]> {
  return apiFetch<PurchaseRequestView[]>(`/demandes?vue=${vue}`, { method: "GET" });
}

/** GET /demandes/:id — parties concernées seulement (404 sinon). */
export function getPurchaseRequest(id: string): Promise<PurchaseRequestView> {
  return apiFetch<PurchaseRequestView>(`/demandes/${encodeURIComponent(id)}`, { method: "GET" });
}

/**
 * POST /demandes/:id/envoyer — `telephone` optionnel (T36,
 * backend/src/purchase-requests/dto/envoyer-purchase-request.dto.ts) : ignoré
 * si le compte acheteur a déjà un numéro (comportement inchangé), sinon
 * obligatoire — sans quoi l'API répond `400 BUYER_PHONE_REQUIRED` et la
 * demande reste en brouillon. Fourni, il est normalisé E.164 par le serveur
 * et enregistré sur le compte ; collision avec un autre compte →
 * `409 PHONE_ALREADY_USED`.
 */
export function sendPurchaseRequest(id: string, telephone?: string): Promise<PurchaseRequestView> {
  return apiFetch<PurchaseRequestView>(`/demandes/${encodeURIComponent(id)}/envoyer`, {
    method: "POST",
    body: telephone ? { telephone } : undefined,
  });
}

/** POST /demandes/:id/annuler */
export function cancelPurchaseRequest(id: string): Promise<PurchaseRequestView> {
  return apiFetch<PurchaseRequestView>(`/demandes/${encodeURIComponent(id)}/annuler`, {
    method: "POST",
  });
}

/**
 * POST /demandes/:id/cloturer — réservé au vendeur destinataire, uniquement
 * sur une demande ENVOYEE : tranche l'issue (ABOUTIE/ANNULEE), notifie
 * l'acheteur qui peut alors laisser un avis.
 */
export function closePurchaseRequest(
  id: string,
  resultat: ResultatDemande,
): Promise<PurchaseRequestView> {
  return apiFetch<PurchaseRequestView>(`/demandes/${encodeURIComponent(id)}/cloturer`, {
    method: "POST",
    body: { resultat },
  });
}
