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

export interface DemandesContextValue {
  /**
   * Mes demandes en tant qu'ACHETEUR uniquement. GET /demandes renvoie aussi
   * les demandes reçues côté vendeur (ENVOYEE/CLOTUREE — CDC §12.4 : un
   * vendeur peut acheter ailleurs), hors périmètre de « Ma demande d'achat »
   * (T16, voir refresh() ci-dessous pour le filtre).
   */
  demandes: PurchaseRequestView[] | null;
  loading: boolean;
  error: string | null;
  /** Nombre de brouillons EN_COURS — badge sidebar. */
  draftCount: number;
  refresh: () => Promise<void>;
}

const DemandesContext = createContext<DemandesContextValue | null>(null);

/**
 * Partage la liste de mes demandes d'achat entre la sidebar (badge « Ma
 * demande ») et les pages /demandes, /demandes/[id] — même pattern que
 * GeoProvider (src/lib/geo/GeoProvider.tsx) : monté une fois dans AppShell,
 * au-dessus de la sidebar et du contenu de page, et rafraîchi (refresh())
 * après chaque mutation (ajout, envoi, annulation, retrait d'article) pour
 * que le compteur reste synchronisé sans re-fetch dupliqué à chaque écran.
 *
 * AppShell ne monte ce provider qu'une fois la session active confirmée
 * (même emplacement que GeoProvider) : il n'a donc pas besoin de consulter
 * AuthContext lui-même, un jeton valide est déjà garanti au montage.
 */
export function DemandesProvider({ children }: { children: ReactNode }) {
  const [demandes, setDemandes] = useState<PurchaseRequestView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listPurchaseRequests();
      // Ne garde que « mes demandes en tant qu'acheteur » : sur les
      // demandes reçues côté vendeur, `interlocuteur.statutVendeur` est
      // toujours absent (backend/src/purchase-requests/purchase-requests.service.ts,
      // `versVue` — seul le côté acheteur voit le statutVendeur du vendeur).
      // Ce signal évite de dépendre d'AuthContext pour connaître mon propre id.
      setDemandes(list.filter((demande) => demande.interlocuteur.statutVendeur !== undefined));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible de charger tes demandes. Réessaie.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial au montage, même convention que ProduitsView/CatalogueView.
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh() est stable (useCallback sans dépendance) ; une seule tentative au montage.
  }, []);

  const draftCount = useMemo(
    () => demandes?.filter((demande) => demande.statut === "EN_COURS").length ?? 0,
    [demandes],
  );

  const value = useMemo<DemandesContextValue>(
    () => ({ demandes, loading, error, draftCount, refresh }),
    [demandes, loading, error, draftCount, refresh],
  );

  return <DemandesContext.Provider value={value}>{children}</DemandesContext.Provider>;
}

export function useDemandes(): DemandesContextValue {
  const ctx = useContext(DemandesContext);
  if (!ctx) {
    throw new Error("useDemandes doit être utilisé à l'intérieur d'un <DemandesProvider>.");
  }
  return ctx;
}
