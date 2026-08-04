"use client";

import { Alert, Button } from "@/components/ui";
import { DemandeRecueCard } from "@/components/purchase-requests/DemandeRecueCard";
import { useDemandesRecues } from "@/lib/purchase-requests";
import type { PurchaseRequestView, StatutDemande } from "@/lib/purchase-requests";

const GROUPS: { statut: StatutDemande; title: string }[] = [
  { statut: "ENVOYEE", title: "Envoyées" },
  { statut: "CLOTUREE", title: "Clôturées" },
];

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[18px] border border-border bg-white">
      <div className="h-16 border-b border-beige bg-beige-soft" />
      <div className="h-20 border-b border-beige-soft bg-beige-soft/60" />
      <div className="h-14 bg-beige-soft/40" />
    </div>
  );
}

/**
 * « Demandes reçues » (/vendeur/demandes, T17b) — écran isSellerReq du
 * prototype (docs/Design de marketplace locale/Makinum.dc.html) : les
 * demandes reçues (GET /demandes?vue=vendeur — jamais les brouillons
 * EN_COURS d'autrui, jamais visibles avant l'envoi) groupées Envoyées /
 * Clôturées. Consomme directement useDemandesRecues() — DemandesRecuesProvider
 * (monté dans AppShell) porte déjà le fetch initial ; les mutations
 * (DemandeRecueCard, clôture) rappellent refresh() et ce composant se
 * re-rend automatiquement avec la liste à jour.
 */
export function VendeurDemandesView() {
  const { demandesRecues, loading, error, refresh } = useDemandesRecues();

  const grouped = GROUPS.map((group) => ({
    ...group,
    items: (demandesRecues ?? []).filter((demande) => demande.statut === group.statut),
  }));
  const isEmpty = demandesRecues !== null && demandesRecues.length === 0;

  return (
    <div className="mx-auto max-w-[820px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <div className="mb-[22px]">
        <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
          Demandes reçues
        </h1>
        <p className="text-[14.5px] text-brand-subtle">
          Appelle l&apos;acheteur pour convenir des détails, puis clôture la demande.
        </p>
      </div>

      {error ? (
        <Alert variant="danger" className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => refresh()}>
            Réessayer
          </Button>
        </Alert>
      ) : null}

      {loading && demandesRecues === null ? (
        <div className="flex flex-col gap-5">
          {Array.from({ length: 2 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : isEmpty && !error ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-white px-6 py-16 text-center">
          <p className="text-[14.5px] text-brand-subtle">
            Tu n&apos;as reçu aucune demande d&apos;achat pour l&apos;instant.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.statut}>
                <h2 className="mb-3 font-display text-[16px] font-bold text-ink">
                  {group.title} ({group.items.length})
                </h2>
                <div className="flex flex-col gap-4">
                  {group.items.map((demande: PurchaseRequestView) => (
                    <DemandeRecueCard key={demande.id} demande={demande} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
