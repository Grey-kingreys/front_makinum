import { apiFetch } from "@/lib/api";

import type { NotificationListResult, NotificationView } from "./types";

/**
 * Wrappers du module notifications — endpoints de
 * backend/src/notifications/notifications.controller.ts, tous authentifiés
 * (chaque utilisateur ne voit et ne modifie que ses propres notifications).
 */

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  /** Filtre optionnel sur le statut de lecture ; absent = pas de filtre. */
  lu?: boolean;
}

function buildNotificationsQuery(params: ListNotificationsParams): string {
  const usp = new URLSearchParams();
  if (params.page !== undefined) usp.set("page", String(params.page));
  if (params.limit !== undefined) usp.set("limit", String(params.limit));
  if (params.lu !== undefined) usp.set("lu", String(params.lu));
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/** GET /notifications */
export function listNotifications(
  params: ListNotificationsParams = {},
): Promise<NotificationListResult> {
  return apiFetch<NotificationListResult>(`/notifications${buildNotificationsQuery(params)}`, {
    method: "GET",
  });
}

/** PATCH /notifications/:id/lu */
export function markNotificationRead(id: string): Promise<NotificationView> {
  return apiFetch<NotificationView>(`/notifications/${encodeURIComponent(id)}/lu`, {
    method: "PATCH",
  });
}

/** PATCH /notifications/lu — marque toutes mes notifications comme lues. */
export function markAllNotificationsRead(): Promise<{ nombre: number }> {
  return apiFetch<{ nombre: number }>("/notifications/lu", { method: "PATCH" });
}
