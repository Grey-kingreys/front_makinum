import { ApiError } from "@/lib/api";

/**
 * Messages transverses partagés par les écrans « Ma demande » (T16) — même
 * convention que describeLoginError (src/app/(auth)/connexion/ConnexionForm.tsx) :
 * code métier (backend/src/purchase-requests/purchase-requests.errors.ts) →
 * phrase utilisateur.
 */
export function describeDemandeError(
  error: unknown,
  fallback = "Une erreur est survenue. Réessaie.",
): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "CANNOT_BUY_OWN_PRODUCT":
        return "Impossible d'acheter ton propre produit.";
      case "PRODUCT_INACTIVE":
        return "Ce produit n'est plus disponible.";
      case "PRODUCT_NOT_FOUND":
        return "Ce produit n'existe plus.";
      case "WRONG_VENDOR":
        return "Ce produit appartient à un autre vendeur que celui de cette demande.";
      case "ITEM_NOT_FOUND":
        return "Cet article ne fait plus partie de la demande.";
      case "EMPTY_REQUEST":
        return "Ajoute au moins un article avant d'envoyer la demande.";
      case "PURCHASE_REQUEST_NOT_FOUND":
        return "Cette demande est introuvable.";
      // La demande a changé d'état entre le chargement de la page et
      // l'action (ex. clôturée entretemps par le vendeur) : seule une
      // relecture depuis le serveur peut réconcilier l'affichage.
      case "INVALID_STATE_TRANSITION":
        return "Cette demande a changé d'état, recharge la page.";
      case "RATE_LIMITED":
        return "Trop de tentatives, réessaie dans un moment.";
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}
