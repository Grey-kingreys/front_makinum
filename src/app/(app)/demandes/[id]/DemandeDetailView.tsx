"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui";
import { DemandeCard } from "@/components/purchase-requests/DemandeCard";
import { ApiError } from "@/lib/api";
import { getPurchaseRequest } from "@/lib/purchase-requests";
import type { PurchaseRequestView } from "@/lib/purchase-requests";

interface DemandeDetailViewProps {
  demandeId: string;
}

/**
 * Détail d'une demande (/demandes/[id]) — mêmes infos et actions que la
 * carte de liste (DemandeCard partagé), pour un lien direct (ex. « Voir ma
 * demande » depuis la fiche produit après ajout). Fetch client-side (comme
 * EditionProduitView, ../vendeur/produits/[id]/EditionProduitView.tsx) : le
 * jeton de session (en mémoire) n'existe pas côté serveur, GET /demandes/:id
 * exige un JWT — donc pas de Server Component ici, et un 404 « propre »
 * local plutôt que le notFound() de Next (réservé aux fetchs serveur).
 */
export function DemandeDetailView({ demandeId }: DemandeDetailViewProps) {
  const router = useRouter();
  const [demande, setDemande] = useState<PurchaseRequestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDemande = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setLoadError(null);
    try {
      const fetched = await getPurchaseRequest(demandeId);
      setDemande(fetched);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setLoadError(err instanceof ApiError ? err.message : "Impossible de charger cette demande.");
      }
    } finally {
      setLoading(false);
    }
  }, [demandeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial au montage, même convention que EditionProduitView/CatalogueView.
    loadDemande();
  }, [loadDemande]);

  function handleChanged(updated: PurchaseRequestView | null) {
    if (updated === null) {
      // Dernier article retiré : le brouillon a disparu côté serveur.
      router.replace("/demandes");
      return;
    }
    setDemande(updated);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[680px] px-6 pb-[60px] pt-[28px] sm:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/2 rounded bg-beige-soft" />
          <div className="h-40 rounded bg-beige-soft" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-[680px] px-6 pb-[60px] pt-[28px] sm:px-8">
        <p className="mb-4 text-[14.5px] text-brand-subtle">Cette demande est introuvable.</p>
        <Link href="/demandes" className="text-brand underline hover:text-accent-strong">
          ← Retour à mes demandes
        </Link>
      </div>
    );
  }

  if (loadError || !demande) {
    return (
      <div className="mx-auto max-w-[680px] px-6 pb-[60px] pt-[28px] sm:px-8">
        <Alert variant="danger">{loadError ?? "Impossible de charger cette demande."}</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[680px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <Link href="/demandes" className="mb-5 inline-block text-[13.5px] text-brand-subtle hover:text-brand">
        ← Retour à mes demandes
      </Link>
      <h1 className="mb-5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
        Ma demande d&apos;achat
      </h1>
      <DemandeCard demande={demande} onChanged={handleChanged} />
    </div>
  );
}
