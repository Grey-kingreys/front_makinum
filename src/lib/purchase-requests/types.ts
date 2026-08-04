/**
 * Types alignés sur le contrat backend (lecture seule) :
 * backend/src/purchase-requests/purchase-requests.types.ts.
 */

import type { StatutVendeur } from "@/lib/products/types";

export type StatutDemande = "EN_COURS" | "ENVOYEE" | "CLOTUREE";
export type ResultatDemande = "ABOUTIE" | "ANNULEE";

export interface PurchaseRequestItemProduitView {
  id: string;
  titre: string;
  /** Décimal exact rendu en chaîne — voir formatPrixGNF pour l'affichage. */
  prix: string;
  /** `urlMiniature` de la photo d'ordre 1 ; `null` si le produit n'a pas de photo. */
  miniature: string | null;
}

export interface PurchaseRequestItemView {
  id: string;
  produitId: string;
  quantite: number;
  produit: PurchaseRequestItemProduitView;
}

/**
 * L'autre partie de la demande, vue depuis l'appelant courant. Un acheteur
 * voit le nom et le statutVendeur du vendeur ; un vendeur ne voit que le nom
 * de l'acheteur (pas de statutVendeur côté acheteur, CDC §12.4). Ce champ
 * `statutVendeur` sert aussi de signal pour distinguer « mes demandes en tant
 * qu'acheteur » des demandes reçues côté vendeur — voir DemandesProvider.
 */
export interface PurchaseRequestInterlocuteurView {
  id: string;
  nom: string;
  statutVendeur?: StatutVendeur;
}

export interface PurchaseRequestView {
  id: string;
  statut: StatutDemande;
  resultat: ResultatDemande | null;
  acheteurId: string;
  vendeurId: string;
  dateCreation: string;
  dateMiseAJour: string;
  items: PurchaseRequestItemView[];
  interlocuteur: PurchaseRequestInterlocuteurView;
}
