"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alert, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import {
  describeNotificationError,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationDemandeId,
  notificationMessage,
  notificationTitre,
  useNotifications,
  type NotificationView,
} from "@/lib/notifications";

const PAGE_SIZE = 20;

function NotificationRow({ notification }: { notification: NotificationView }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors",
        notification.lu ? "border-border bg-white" : "border-tint-brand-border bg-tint-brand",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-[7px] h-2 w-2 shrink-0 rounded-full",
          notification.lu ? "bg-transparent" : "bg-brand-vivid",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className={cn("text-[14.5px] text-ink", notification.lu ? "font-normal" : "font-semibold")}>
          {notificationTitre(notification)}
        </div>
        <div className="mt-0.5 text-[13.5px] text-brand-subtle">{notificationMessage(notification)}</div>
        <div className="mt-1.5 text-[12px] text-brand-faint">{formatDate(notification.dateCreation)}</div>
      </div>
      {!notification.lu ? (
        <span className="mt-0.5 shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-cream">
          non lue
        </span>
      ) : null}
    </div>
  );
}

/**
 * Page /notifications — liste paginée de mes notifications (les plus
 * récentes d'abord), non-lues distinguées visuellement (fond teinté, point
 * plein, libellé « non lue »). Cliquer une notification la marque lue
 * (PATCH /notifications/:id/lu) ; si son contenu porte `demandeId`, le clic
 * navigue aussi vers /demandes/:id (NOUVELLE_DEMANDE, DEMANDE_CLOTUREE,
 * DEMANDE_ANNULEE — voir backend/src/purchase-requests/purchase-requests.service.ts,
 * `emettre`). « Tout marquer lu » (PATCH /notifications/lu) traite tout d'un
 * coup. Les deux mutations rappellent NotificationsProvider.refresh() pour
 * garder le badge de la cloche synchronisé.
 */
export function NotificationsView() {
  const { refresh: refreshBadge } = useNotifications();
  const [items, setItems] = useState<NotificationView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await listNotifications({ page: targetPage, limit: PAGE_SIZE });
      setItems((prev) => (append ? [...prev, ...result.items] : result.items));
      setTotal(result.total);
      setPage(targetPage);
    } catch (err) {
      setError(describeNotificationError(err, "Impossible de charger tes notifications."));
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial au montage, même convention que ProduitsView/CatalogueView.
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load() est stable (useCallback sans dépendance) ; une seule tentative au montage.
  }, []);

  async function handleOpen(notification: NotificationView) {
    if (notification.lu) return;
    setPendingId(notification.id);
    setError(null);
    try {
      const updated = await markNotificationRead(notification.id);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      await refreshBadge();
    } catch (err) {
      setError(describeNotificationError(err, "Impossible de marquer cette notification comme lue."));
    } finally {
      setPendingId(null);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAllRead(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((item) => ({ ...item, lu: true })));
      await refreshBadge();
    } catch (err) {
      setError(describeNotificationError(err, "Impossible de tout marquer comme lu."));
    } finally {
      setMarkingAllRead(false);
    }
  }

  const hasMore = items.length < total;
  const hasUnread = items.some((item) => !item.lu);

  return (
    <div className="mx-auto max-w-[720px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
            Notifications
          </h1>
          <p className="text-[14.5px] text-brand-subtle">
            Tes notifications Makinum, les plus récentes d&apos;abord.
          </p>
        </div>
        {hasUnread ? (
          <Button size="sm" variant="outline" onClick={handleMarkAllRead} disabled={markingAllRead}>
            {markingAllRead ? "…" : "Tout marquer lu"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <Alert variant="danger" className="mb-5">
          {error}
        </Alert>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-beige-soft" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-white px-6 py-16 text-center">
          <p className="text-[14.5px] text-brand-subtle">
            Tu n&apos;as aucune notification pour le moment.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((notification) => {
            const demandeId = notificationDemandeId(notification);
            return (
              <li key={notification.id}>
                {demandeId ? (
                  <Link
                    href={`/demandes/${demandeId}`}
                    onClick={() => void handleOpen(notification)}
                    aria-busy={pendingId === notification.id}
                    className="block rounded-xl focus-visible:outline-none focus-visible:shadow-focus-brand"
                  >
                    <NotificationRow notification={notification} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleOpen(notification)}
                    disabled={notification.lu}
                    aria-busy={pendingId === notification.id}
                    className="block w-full rounded-xl text-left disabled:cursor-default focus-visible:outline-none focus-visible:shadow-focus-brand"
                  >
                    <NotificationRow notification={notification} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore ? (
        <div className="mt-5 text-center">
          <Button variant="outline" size="sm" onClick={() => load(page + 1, true)} disabled={loadingMore}>
            {loadingMore ? "Chargement…" : "Voir plus"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
