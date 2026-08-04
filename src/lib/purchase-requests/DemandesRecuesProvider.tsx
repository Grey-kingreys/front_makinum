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

import { listPurchaseRequests } from "./api";
import type { PurchaseRequestView } from "./types";

export interface DemandesRecuesContextValue {
  /** Demandes reçues en tant que VENDEUR (ENVOYEE/CLOTUREE — GET /demandes?vue=vendeur). */
  demandesRecues: PurchaseRequestView[] | null;
  loading: boolean;
  error: string | null;
  /** Nombre de demandes ENVOYEE non encore clôturées — badge sidebar « Demandes reçues ». */
  pendingCount: number;
  refresh: () => Promise<void>;
}

const DemandesRecuesContext = createContext<DemandesRecuesContextValue | null>(null);

/**
 * Équivalent vendeur de DemandesProvider (src/lib/purchase-requests/DemandesProvider.tsx) :
 * partage la liste des demandes reçues entre la sidebar (badge « Demandes
 * reçues », T17b) et /vendeur/demandes — monté une fois dans AppShell,
 * rafraîchi (refresh()) après chaque clôture pour que le badge et la liste
 * restent synchronisés sans re-fetch dupliqué.
 *
 * Monté pour tous les rôles comme DemandesProvider (même emplacement dans
 * AppShell) : un compte ACHETEUR/ADMIN n'a simplement aucune demande reçue,
 * la liste renvoyée est alors vide.
 */
export function DemandesRecuesProvider({ children }: { children: ReactNode }) {
  const [demandesRecues, setDemandesRecues] = useState<PurchaseRequestView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listPurchaseRequests("vendeur");
      setDemandesRecues(list);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossible de charger les demandes reçues. Réessaie.",
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

  const pendingCount = useMemo(
    () => demandesRecues?.filter((demande) => demande.statut === "ENVOYEE").length ?? 0,
    [demandesRecues],
  );

  const value = useMemo<DemandesRecuesContextValue>(
    () => ({ demandesRecues, loading, error, pendingCount, refresh }),
    [demandesRecues, loading, error, pendingCount, refresh],
  );

  return (
    <DemandesRecuesContext.Provider value={value}>{children}</DemandesRecuesContext.Provider>
  );
}

export function useDemandesRecues(): DemandesRecuesContextValue {
  const ctx = useContext(DemandesRecuesContext);
  if (!ctx) {
    throw new Error(
      "useDemandesRecues doit être utilisé à l'intérieur d'un <DemandesRecuesProvider>.",
    );
  }
  return ctx;
}
