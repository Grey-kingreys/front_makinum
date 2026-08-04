"use client";

import { useState } from "react";

import { Badge, type BadgeVariant } from "@/components/ui";
import { PhotoPlaceholder } from "@/components/products/PhotoPlaceholder";
import { VendeurBadge } from "@/components/products/VendeurBadge";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { formatDate, formatPrixGNF, initialsFromName } from "@/lib/format";
import {
  addPurchaseRequestItem,
  cancelPurchaseRequest,
  describeDemandeError,
  removePurchaseRequestItem,
  sendPurchaseRequest,
  useDemandes,
  type PurchaseRequestItemView,
  type PurchaseRequestView,
  type StatutDemande,
} from "@/lib/purchase-requests";
import type { ReviewView } from "@/lib/reviews";

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

interface DemandeCardProps {
  demande: PurchaseRequestView;
  /**
   * Fourni par la page détail (/demandes/[id]) pour resynchroniser son
   * propre état local — elle ne lit pas la liste partagée de useDemandes().
   * `null` si la demande a disparu (dernier article retiré, le brouillon est
   * alors supprimé côté serveur). Sur la liste (/demandes),
   * useDemandes().refresh() seul suffit — pas besoin de ce callback.
   */
  onChanged?: (updated: PurchaseRequestView | null) => void;
}

/**
 * Carte « Ma demande d'achat » (T16) — reprend le style du prototype
 * (docs/Design de marketplace locale/Makinum.dc.html, écran isRequest) :
 * vendeur, articles (miniature/titre/quantité/prix), total indicatif, et
 * actions selon le statut. Partagée entre /demandes (une carte par demande)
 * et /demandes/[id] (une seule carte) — mêmes infos, mêmes actions.
 *
 * « Modifier les quantités » ne propose qu'une augmentation (+1, re-POST
 * additif — backend/src/purchase-requests/purchase-requests.service.ts,
 * `ajouterOuIncrementerItem`) : l'API n'expose aucune décrémentation ni
 * remplacement de quantité, seulement l'ajout (incrémente) et le retrait
 * complet d'une ligne.
 */
export function DemandeCard({ demande, onChanged }: DemandeCardProps) {
  const { refresh: refreshDemandes } = useDemandes();

  const [itemActionPendingId, setItemActionPendingId] = useState<string | null>(null);
  const [itemActionError, setItemActionError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<ReviewView | null>(null);
  const [reviewAlreadyExists, setReviewAlreadyExists] = useState(false);

  const isBrouillon = demande.statut === "EN_COURS";
  const isEnvoyee = demande.statut === "ENVOYEE";
  const isCloturee = demande.statut === "CLOTUREE";

  const total = demande.items.reduce((sum, item) => sum + itemTotal(item), 0);

  async function applyUpdate(updated: PurchaseRequestView | null) {
    await refreshDemandes();
    onChanged?.(updated);
  }

  async function handleIncrement(item: PurchaseRequestItemView) {
    setItemActionPendingId(item.produitId);
    setItemActionError(null);
    try {
      const updated = await addPurchaseRequestItem(demande.id, {
        produitId: item.produitId,
        quantite: 1,
      });
      await applyUpdate(updated);
    } catch (err) {
      setItemActionError(describeDemandeError(err, "Impossible de modifier cette ligne."));
    } finally {
      setItemActionPendingId(null);
    }
  }

  async function handleRemove(item: PurchaseRequestItemView) {
    setItemActionPendingId(item.produitId);
    setItemActionError(null);
    try {
      const { demande: updated } = await removePurchaseRequestItem(demande.id, item.produitId);
      await applyUpdate(updated);
    } catch (err) {
      setItemActionError(describeDemandeError(err, "Impossible de retirer cet article."));
    } finally {
      setItemActionPendingId(null);
    }
  }

  async function handleSend() {
    if (!window.confirm(`Envoyer cette demande à ${demande.interlocuteur.nom} ?`)) return;
    setSending(true);
    setSendError(null);
    try {
      const updated = await sendPurchaseRequest(demande.id);
      await applyUpdate(updated);
    } catch (err) {
      setSendError(describeDemandeError(err, "Impossible d'envoyer la demande."));
    } finally {
      setSending(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Annuler cette demande ? Cette action est irréversible.")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelPurchaseRequest(demande.id);
      await applyUpdate(updated);
    } catch (err) {
      setCancelError(describeDemandeError(err, "Impossible d'annuler la demande."));
    } finally {
      setCancelling(false);
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
            <div className="flex items-center gap-2 text-[14.5px] font-medium text-ink">
              {demande.interlocuteur.nom}
              {demande.interlocuteur.statutVendeur ? (
                <VendeurBadge statut={demande.interlocuteur.statutVendeur} />
              ) : null}
            </div>
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
            {isBrouillon ? (
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleIncrement(item)}
                  disabled={itemActionPendingId === item.produitId}
                  aria-label={`Augmenter la quantité de ${item.produit.titre}`}
                  className="grid h-8 w-8 place-items-center rounded-full border border-border-strong text-[15px] text-ink transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  disabled={itemActionPendingId === item.produitId}
                  aria-label={`Retirer ${item.produit.titre} de la demande`}
                  className="text-[13px] text-danger underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Retirer
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {itemActionError ? (
        <p className="border-b border-beige-soft px-5 py-2.5 text-[12.5px] text-danger">
          {itemActionError}
        </p>
      ) : null}

      <div className="flex items-center justify-between bg-cream-alt px-5 py-4">
        <span className="text-[13.5px] text-brand-subtle">
          Total indicatif ({demande.items.length} article{demande.items.length > 1 ? "s" : ""})
        </span>
        <span className="font-display text-[19px] font-bold text-brand">
          {formatPrixGNF(String(total))}
        </span>
      </div>

      {isBrouillon || isEnvoyee ? (
        <div className="flex flex-wrap gap-2.5 border-t border-beige px-5 py-4">
          {isBrouillon ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              aria-busy={sending}
              className="flex-1 rounded-[11px] bg-brand px-4 py-3 text-[14.5px] font-semibold text-cream transition-colors hover:bg-brand-vivid disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Envoi…" : "Envoyer la demande"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            aria-busy={cancelling}
            className="rounded-[11px] border border-border-strong bg-white px-4 py-3 text-[14.5px] text-danger transition-colors hover:border-danger disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelling ? "Annulation…" : "Annuler"}
          </button>
        </div>
      ) : null}

      {sendError ? (
        <p className="border-t border-beige px-5 py-2.5 text-[12.5px] text-danger">{sendError}</p>
      ) : null}
      {cancelError ? (
        <p className="border-t border-beige px-5 py-2.5 text-[12.5px] text-danger">{cancelError}</p>
      ) : null}

      {isCloturee ? (
        submittedReview ? (
          <div className="flex items-center gap-2 border-t border-beige px-5 py-4">
            <span className="text-[13.5px] font-medium text-brand-vivid">
              Avis envoyé ★{submittedReview.note}
            </span>
          </div>
        ) : reviewAlreadyExists ? (
          <div className="border-t border-beige px-5 py-4">
            <span className="text-[13.5px] text-brand-subtle">
              Tu as déjà laissé un avis pour cette demande.
            </span>
          </div>
        ) : reviewOpen ? (
          <ReviewForm
            purchaseRequestId={demande.id}
            onSubmitted={(review) => {
              setSubmittedReview(review);
              setReviewOpen(false);
            }}
            onAlreadyExists={() => {
              setReviewAlreadyExists(true);
              setReviewOpen(false);
            }}
            onCancel={() => setReviewOpen(false)}
          />
        ) : (
          <div className="border-t border-beige px-5 py-4">
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="text-[13.5px] font-medium text-brand underline"
            >
              Laisser un avis
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
