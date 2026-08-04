/**
 * Types alignés sur le contrat backend (lecture seule) :
 * backend/src/reviews/reviews.types.ts.
 */

export interface ReviewAuteurView {
  nom: string;
}

export interface ReviewProduitView {
  titre: string;
}

/**
 * Ligne d'avis telle qu'exposée par `GET /vendeurs/:id/avis` (public) —
 * volontairement minimale : ni id, ni identifiants acheteur/vendeur/demande
 * (CDC §12.5, anti-faux-avis).
 */
export interface VendeurReviewItem {
  note: number;
  commentaire: string | null;
  dateCreation: string;
  auteur: ReviewAuteurView;
  /** `null` quand la demande portait sur plusieurs produits (CDC §6). */
  produit: ReviewProduitView | null;
}

/** Résumé agrégé des avis d'un vendeur. */
export interface ReviewResume {
  /** Moyenne arrondie à 0,1 ; `null` sans avis. */
  noteMoyenne: number | null;
  nbAvis: number;
}

export interface VendeurReviewsResult {
  items: VendeurReviewItem[];
  total: number;
  page: number;
  limit: number;
  resume: ReviewResume;
}

/** Vue complète renvoyée par `POST /avis` — l'auteur y retrouve son propre avis. */
export interface ReviewView {
  id: string;
  purchaseRequestId: string;
  vendeurId: string;
  produitId: string | null;
  note: number;
  commentaire: string | null;
  dateCreation: string;
  auteur: ReviewAuteurView;
  produit: ReviewProduitView | null;
}
