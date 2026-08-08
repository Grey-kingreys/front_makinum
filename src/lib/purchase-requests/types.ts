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
 *
 * `telephone` (T43) : absent tant que la demande est un brouillon
 * (`EN_COURS`), présent dès `ENVOYEE` et sur `CLOTUREE` — symétrique,
 * acheteur et vendeur voient chacun le numéro de l'autre. Absent aussi (clé
 * omise, jamais `null`) quand l'interlocuteur n'a pas de numéro renseigné.
 */
export interface PurchaseRequestInterlocuteurView {
  id: string;
  nom: string;
  statutVendeur?: StatutVendeur;
  telephone?: string;
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
