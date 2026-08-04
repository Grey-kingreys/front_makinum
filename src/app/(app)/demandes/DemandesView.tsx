"use client";

import Link from "next/link";

import { Alert, Button } from "@/components/ui";
import { DemandeCard } from "@/components/purchase-requests/DemandeCard";
import { useDemandes } from "@/lib/purchase-requests";
import type { PurchaseRequestView, StatutDemande } from "@/lib/purchase-requests";

const PRIMARY_LINK_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-md bg-brand px-5 py-3.5 text-[15px] font-semibold text-cream transition-colors hover:bg-brand-vivid focus-visible:outline-none focus-visible:shadow-focus-brand";

const GROUPS: { statut: StatutDemande; title: string }[] = [
  { statut: "EN_COURS", title: "Brouillons" },
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
 * « Ma demande d'achat » (/demandes) — écran isRequest du prototype
 * (docs/Design de marketplace locale/Makinum.dc.html), adapté pour montrer
 * TOUTES mes demandes (pas seulement un panier courant) groupées par statut
 * : Brouillons / Envoyées / Clôturées. Consomme directement useDemandes() —
 * DemandesProvider (monté dans AppShell) porte déjà le fetch initial ; les
 * mutations (DemandeCard) rappellent refresh() et ce composant se
 * re-rend automatiquement avec la liste à jour.
 */
export function DemandesView() {
  const { demandes, loading, error, refresh } = useDemandes();

  const grouped = GROUPS.map((group) => ({
    ...group,
    items: (demandes ?? []).filter((demande) => demande.statut === group.statut),
  }));
  const isEmpty = demandes !== null && demandes.length === 0;

  return (
    <div className="mx-auto max-w-[820px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <div className="mb-[22px]">
        <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
          Ma demande d&apos;achat
        </h1>
        <p className="text-[14.5px] text-brand-subtle">
          Une intention d&apos;achat, pas une commande. Aucun paiement n&apos;est prélevé.
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

      {loading && demandes === null ? (
        <div className="flex flex-col gap-5">
          {Array.from({ length: 2 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : isEmpty && !error ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-white px-6 py-16 text-center">
          <p className="mb-4 text-[14.5px] text-brand-subtle">
            Tu n&apos;as pas encore de demande d&apos;achat.
          </p>
          <Link href="/produits" className={PRIMARY_LINK_CLASSES}>
            Explorer les produits
          </Link>
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
                    <DemandeCard key={demande.id} demande={demande} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
