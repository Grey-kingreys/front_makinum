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
  latitude?: number | null;
  longitude?: number | null;
}

export interface LoginResponse {
  accessToken: string;
  user: PublicUser;
}
