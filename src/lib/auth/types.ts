/** Types alignés sur le backend (backend/src/auth/auth.types.ts, prisma/schema.prisma). */

export type Role = "ADMIN" | "VENDEUR" | "ACHETEUR";
export type StatutVendeur = "LIBRE" | "VERIFIE" | "CONFIANCE";
export type StatutCompte = "ACTIF" | "SUSPENDU";

/** Profil utilisateur exposé par l'API — sans champs sensibles. */
export interface PublicUser {
  id: string;
  nom: string;
  /** Canal de contact appel/WhatsApp — optionnel sauf pour un vendeur (backend `VENDOR_PHONE_REQUIRED`). */
  telephone: string | null;
  telephoneVerifie: boolean;
  email?: string | null;
  emailVerifie: boolean;
  role: Role;
  statutVendeur: StatutVendeur;
  statutCompte: StatutCompte;
  /**
   * Validation admin du compte vendeur (T30) — débloque la publication de
   * produits (POST/PATCH /products, POST /products/:id/photos, sinon 403
   * VENDOR_NOT_VALIDATED). Toujours présent (le backend ne l'omet jamais),
   * sans signification pour les rôles ACHETEUR/ADMIN (`false` par défaut en
   * base, jamais exploité en dehors de VENDEUR).
   */
  vendeurValide: boolean;
  /**
   * Consentement du vendeur à ce qu'un administrateur publie des produits en
   * son nom (T52a/T52b, `PATCH /vendeur/parametres`) — réglable librement,
   * sans garde métier côté backend. Toujours présent (même convention que
   * `vendeurValide`), sans signification pour les rôles ACHETEUR/ADMIN
   * (`false` par défaut en base).
   */
  autoriseAdminPublication: boolean;
  latitude?: number | null;
  longitude?: number | null;
  /**
   * Lieu de vente du compte vendeur (T66a, `PATCH /vendeur/parametres`) —
   * réglé une fois, sert à pré-remplir la position de chaque nouvelle
   * publication côté formulaire produit (T66b, voir
   * src/components/products/ProductForm.tsx). `null` tant que non renseigné
   * ou après retrait. Toujours présent (même convention que
   * `autoriseAdminPublication` : le backend ne l'omet jamais), sans
   * signification pour les rôles ACHETEUR/ADMIN. Distinct de la position
   * éventuelle d'un produit individuel (`ProductView.latitude/longitude`,
   * src/lib/products/types.ts) : ce champ-ci vit sur le compte, pas sur un
   * produit.
   */
  lieuVente: { latitude: number; longitude: number } | null;
}

export interface LoginResponse {
  accessToken: string;
  user: PublicUser;
}
