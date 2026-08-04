"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "@/lib/api";

import { listNotifications } from "./api";

export interface NotificationsContextValue {
  /** Nombre de notifications non lues — badge cloche (sidebar + barre mobile), masqué à 0. */
  nbNonLues: number;
  loading: boolean;
  error: string | null;
  /**
   * Recharge le compteur. À appeler après chaque mutation (marquage lu
   * unitaire ou global depuis /notifications) pour que le badge reste
   * synchronisé, même pattern que DemandesProvider.refresh().
   */
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/**
 * Partage le compteur de notifications non lues entre la cloche (sidebar
 * desktop + barre mobile, Sidebar.tsx) et la page /notifications — même
 * pattern que DemandesProvider (src/lib/purchase-requests/DemandesProvider.tsx) :
 * monté une fois dans AppShell, au-dessus de la sidebar et du contenu de
 * page, rechargé au montage et après chaque mutation.
 *
 * `limit: 1` sur le fetch : seul `nbNonLues` (renvoyé quelle que soit la
 * page demandée) nous intéresse ici — la liste elle-même est chargée
 * séparément par NotificationsView, sans dupliquer le fetch.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [nbNonLues, setNbNonLues] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listNotifications({ limit: 1 });
      setNbNonLues(result.nbNonLues);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible de charger tes notifications. Réessaie.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial au montage, même convention que DemandesProvider.
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh() est stable (useCallback sans dépendance) ; une seule tentative au montage.
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({ nbNonLues, loading, error, refresh }),
    [nbNonLues, loading, error, refresh],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications doit être utilisé à l'intérieur d'un <NotificationsProvider>.");
  }
  return ctx;
}
