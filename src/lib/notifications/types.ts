/**
 * Types alignés sur le contrat backend (lecture seule) :
 * backend/src/notifications/notifications.types.ts.
 */

export type CanalNotification = "SMS" | "WHATSAPP" | "EMAIL" | "IN_APP";

export interface NotificationView {
  id: string;
  /** Une des constantes NotificationType côté backend (NOUVELLE_DEMANDE,
   * DEMANDE_CLOTUREE…) ou tout futur type ajouté là-bas — colonne String,
   * jamais un enum fermé. */
  type: string;
  canal: CanalNotification;
  /**
   * Contenu libre stocké en colonne Json — `titre`/`message` sont garantis
   * par tous les émetteurs actuels (purchase-requests), mais typé `unknown`
   * ici pour rester honnête vis-à-vis d'une colonne Json non validée côté
   * backend ; voir notificationTitre/notificationMessage/notificationDemandeId.
   */
  contenu: unknown;
  lu: boolean;
  dateCreation: string;
}

export interface NotificationListResult {
  items: NotificationView[];
  total: number;
  nbNonLues: number;
}

function contenuField(notification: NotificationView, cle: string): string | undefined {
  const contenu = notification.contenu;
  if (!contenu || typeof contenu !== "object") return undefined;
  const value = (contenu as Record<string, unknown>)[cle];
  return typeof value === "string" && value ? value : undefined;
}

/** Titre affiché — retombe sur un libellé générique si le Json est inattendu. */
export function notificationTitre(notification: NotificationView): string {
  return contenuField(notification, "titre") ?? "Notification";
}

/** Message affiché — chaîne vide si le Json est inattendu. */
export function notificationMessage(notification: NotificationView): string {
  return contenuField(notification, "message") ?? "";
}

/**
 * `demandeId` n'est présent que sur les notifications liées à une demande
 * d'achat (NOUVELLE_DEMANDE, DEMANDE_CLOTUREE, DEMANDE_ANNULEE — voir
 * backend/src/purchase-requests/purchase-requests.service.ts, `emettre`) ;
 * `undefined` sinon (ex. AVERTISSEMENT).
 */
export function notificationDemandeId(notification: NotificationView): string | undefined {
  return contenuField(notification, "demandeId");
}
