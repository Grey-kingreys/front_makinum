/**
 * Types alignés sur le contrat backend (lecture seule) :
 * backend/src/reports/reports.types.ts.
 */

import type { StatutCompte, StatutVendeur } from "@/lib/auth/types";

/** Longueur du motif d'un signalement (CDC §8.3) : 5 à 500 caractères. */
export const MOTIF_MIN_LENGTH = 5;
export const MOTIF_MAX_LENGTH = 500;

export type StatutSignalement = "NOUVEAU" | "EN_EXAMEN" | "TRAITE";

/**
 * Action réellement exécutée par l'admin en clôturant un signalement
 * (`ReportsService.executerAction`, backend/src/reports/reports.service.ts) :
 * AUCUNE/CONTACT n'ont aucun effet de bord, AVERTISSEMENT notifie la cible,
 * DESACTIVATION désactive le produit visé (exige un `produitId`), SUSPENSION
 * suspend le compte cible et désactive tout son catalogue en cascade.
 */
export type ActionAdmin = "AUCUNE" | "AVERTISSEMENT" | "CONTACT" | "DESACTIVATION" | "SUSPENSION";

export interface SignaleurView {
  id: string;
  nom: string;
}

export interface CibleSignalementView {
  id: string;
  nom: string;
  statutCompte: StatutCompte;
  statutVendeur: StatutVendeur;
}

export interface ProduitSignaleView {
  id: string;
  titre: string;
  actif: boolean;
}

/** Vue d'un signalement telle qu'exposée par `POST /signalements` et `GET`/`PATCH /admin/signalements`. */
export interface ReportView {
  id: string;
  motif: string;
  statut: StatutSignalement;
  actionAdmin: ActionAdmin;
  /** ISO — `Date` côté backend, sérialisé en chaîne sur le fil. */
  dateCreation: string;
  signaleur: SignaleurView;
  cible: CibleSignalementView;
  produit: ProduitSignaleView | null;
}

export interface ReportListResult {
  items: ReportView[];
  total: number;
  page: number;
  limit: number;
}
