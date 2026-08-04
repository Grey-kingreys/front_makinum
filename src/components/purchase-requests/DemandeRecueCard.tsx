"use client";

import { useState } from "react";

import { Badge, type BadgeVariant } from "@/components/ui";
import { PhotoPlaceholder } from "@/components/products/PhotoPlaceholder";
import { formatDate, formatPrixGNF, initialsFromName } from "@/lib/format";
import {
  closePurchaseRequest,
  describeDemandeError,
  useDemandesRecues,
  type PurchaseRequestItemView,
  type PurchaseRequestView,
  type ResultatDemande,
  type StatutDemande,
} from "@/lib/purchase-requests";

const STATUT_LABEL: Record<StatutDemande, string> = {
  EN_COURS: "Brouillon",
  ENVOYEE: "Envoyée",
  CLOTUREE: "Clôturée",
};

const STATUT_BADGE_VARIANT: Record<StatutDemande, BadgeVariant> = {
  EN_COURS: "neutral",
  ENVOYEE: "confiance",
  CLOTUREE: "libre",
};

function itemTotal(item: PurchaseRequestItemView): number {
  return Number(item.produit.prix) * item.quantite;
}

interface DemandeRecueCardProps {
  demande: PurchaseRequestView;
}

/**
 * Carte « Demandes reçues » (T17b) — pendant vendeur de DemandeCard
 * (src/components/purchase-requests/DemandeCard.tsx), reprend le style du
 * prototype (docs/Design de marketplace locale/Makinum.dc.html, écran
 * isSellerReq) : acheteur, articles (miniature/titre/quantité/prix), total
 * indicatif, et clôture sur une demande ENVOYEE.
 *
 * Le vendeur ne modifie jamais les quantités (lecture seule ici) — seul
 * l'acheteur édite son brouillon (DemandeCard). Clôturer exige une
 * confirmation (l'acheteur est notifié et débloque son avis dès la
 * clôture, quelle que soit l'issue) puis POST /demandes/:id/cloturer.
 */
export function DemandeRecueCard({ demande }: DemandeRecueCardProps) {
  const { refresh: refreshDemandesRecues } = useDemandesRecues();

  const [closingResultat, setClosingResultat] = useState<ResultatDemande | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);

  const isEnvoyee = demande.statut === "ENVOYEE";
  const isCloturee = demande.statut === "CLOTUREE";

  const total = demande.items.reduce((sum, item) => sum + itemTotal(item), 0);

  async function handleClose(resultat: ResultatDemande) {
    const issue = resultat === "ABOUTIE" ? "aboutie" : "annulée";
    if (
      !window.confirm(
        `Clôturer cette demande comme ${issue} ? ${demande.interlocuteur.nom} sera notifié et pourra laisser un avis.`,
      )
    ) {
      return;
    }
    setClosingResultat(resultat);
    setCloseError(null);
    try {
      await closePurchaseRequest(demande.id, resultat);
      await refreshDemandesRecues();
    } catch (err) {
      setCloseError(describeDemandeError(err, "Impossible de clôturer cette demande."));
    } finally {
      setClosingResultat(null);
    }
  }

  const resultatBadge =
    isCloturee && demande.resultat ? (
      <Badge variant={demande.resultat === "ABOUTIE" ? "verifie" : "danger"}>
        {demande.resultat === "ABOUTIE" ? "aboutie" : "annulée"}
      </Badge>
    ) : (
      <Badge variant={STATUT_BADGE_VARIANT[demande.statut]}>{STATUT_LABEL[demande.statut]}</Badge>
    );

  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-beige px-5 py-4">
        <div className="flex items-center gap-[10px]">
          <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-brand text-[12.5px] font-semibold text-accent">
            {initialsFromName(demande.interlocuteur.nom)}
          </div>
          <div>
            <div className="text-[14.5px] font-medium text-ink">{demande.interlocuteur.nom}</div>
            <div className="text-[12.5px] text-brand-subtle">
              Mise à jour le {formatDate(demande.dateMiseAJour)}
            </div>
          </div>
        </div>
        {resultatBadge}
      </div>

      <div>
        {demande.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 border-b border-beige-soft px-5 py-4 last:border-b-0"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[9px]">
              {item.produit.miniature ? (
                // eslint-disable-next-line @next/next/no-img-element -- vignette backend, pas de config next/image en V1.
                <img src={item.produit.miniature} alt="" className="h-full w-full object-cover" />
              ) : (
                <PhotoPlaceholder />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium text-ink">{item.produit.titre}</div>
              <div className="text-[13px] text-brand-subtle">
                {item.quantite} × {formatPrixGNF(item.produit.prix)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between bg-cream-alt px-5 py-4">
        <span className="text-[13.5px] text-brand-subtle">
          Total indicatif ({demande.items.length} article{demande.items.length > 1 ? "s" : ""})
        </span>
        <span className="font-display text-[19px] font-bold text-brand">
          {formatPrixGNF(String(total))}
        </span>
      </div>

      {isEnvoyee ? (
        <div className="flex flex-wrap gap-2.5 border-t border-beige px-5 py-4">
          <button
            type="button"
            onClick={() => handleClose("ABOUTIE")}
            disabled={closingResultat !== null}
            aria-busy={closingResultat === "ABOUTIE"}
            className="flex-1 rounded-[11px] bg-brand px-4 py-3 text-[14.5px] font-semibold text-cream transition-colors hover:bg-brand-vivid disabled:cursor-not-allowed disabled:opacity-60"
          >
            {closingResultat === "ABOUTIE" ? "Clôture…" : "Clôturer · aboutie"}
          </button>
          <button
            type="button"
            onClick={() => handleClose("ANNULEE")}
            disabled={closingResultat !== null}
            aria-busy={closingResultat === "ANNULEE"}
            className="rounded-[11px] border border-border-strong bg-white px-4 py-3 text-[14.5px] text-danger transition-colors hover:border-danger disabled:cursor-not-allowed disabled:opacity-60"
          >
            {closingResultat === "ANNULEE" ? "Clôture…" : "Clôturer · annulée"}
          </button>
        </div>
      ) : null}

      {closeError ? (
        <p className="border-t border-beige px-5 py-2.5 text-[12.5px] text-danger">{closeError}</p>
      ) : null}

      {isCloturee ? (
        <p className="border-t border-beige px-5 py-4 text-[13.5px] text-brand-subtle">
          Demande clôturée. L&apos;acheteur a été notifié et peut laisser un avis.
        </p>
      ) : null}
    </div>
  );
}
