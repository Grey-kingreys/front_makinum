"use client";

import { useState } from "react";

import { Badge, ConfirmDialog, Input, type BadgeVariant } from "@/components/ui";
import { PhotoPlaceholder } from "@/components/products/PhotoPlaceholder";
import { VendeurBadge } from "@/components/products/VendeurBadge";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatPrixGNF, initialsFromName } from "@/lib/format";
import {
  cancelPurchaseRequest,
  describeDemandeError,
  removePurchaseRequestItem,
  sendPurchaseRequest,
  updatePurchaseRequestItemQuantity,
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
 * Sur un brouillon, la quantité de chaque ligne se règle avec un stepper
 * −/+ qui fixe une valeur absolue (PATCH /demandes/:id/items/:produitId,
 * backend/src/purchase-requests/purchase-requests.service.ts,
 * `modifierQuantiteItem`) — min 1 : en dessous, seul le retrait complet de
 * la ligne (bouton « Retirer ») reste possible.
 */
export function DemandeCard({ demande, onChanged }: DemandeCardProps) {
  const { refresh: refreshDemandes } = useDemandes();
  const { user, refresh: refreshAuth } = useAuth();

  const [itemActionPendingId, setItemActionPendingId] = useState<string | null>(null);
  const [itemActionError, setItemActionError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"send" | "cancel" | null>(null);
  // Demandé dans la modale d'envoi uniquement quand le compte acheteur n'a
  // pas encore de téléphone (T36) — canal de rappel du vendeur, exigé par le
  // backend (`POST /demandes/:id/envoyer`, 400 BUYER_PHONE_REQUIRED sinon).
  const [telephoneInput, setTelephoneInput] = useState("");
  const [telephoneError, setTelephoneError] = useState<string | null>(null);

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

  async function handleQuantiteChange(item: PurchaseRequestItemView, quantite: number) {
    if (quantite < 1) return;
    setItemActionPendingId(item.produitId);
    setItemActionError(null);
    try {
      const updated = await updatePurchaseRequestItemQuantity(demande.id, item.produitId, quantite);
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

  /**
   * `telephone` seulement quand le compte acheteur n'en a pas encore (T36) —
   * cf. le champ ajouté dans la modale de confirmation d'envoi ci-dessous.
   * BUYER_PHONE_REQUIRED / PHONE_ALREADY_USED sont mappés sur ce champ pour
   * que la modale reste ouverte et permette de corriger la saisie ; les
   * autres erreurs suivent le circuit `sendError` habituel (modale fermée).
   */
  async function doSend(telephone?: string): Promise<boolean> {
    setSending(true);
    setSendError(null);
    try {
      const updated = telephone
        ? await sendPurchaseRequest(demande.id, telephone)
        : await sendPurchaseRequest(demande.id);
      if (telephone) {
        // Le numéro vient d'être enregistré côté serveur sur le compte :
        // resynchronise la session pour qu'il ne soit plus redemandé.
        await refreshAuth();
      }
      await applyUpdate(updated);
      return true;
    } catch (err) {
      if (err instanceof ApiError && (err.code === "BUYER_PHONE_REQUIRED" || err.code === "PHONE_ALREADY_USED")) {
        setTelephoneError(describeDemandeError(err));
      } else {
        setSendError(describeDemandeError(err, "Impossible d'envoyer la demande."));
      }
      return false;
    } finally {
      setSending(false);
    }
  }

  async function doCancel() {
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

  function handleSend() {
    setTelephoneInput("");
    setTelephoneError(null);
    setConfirmAction("send");
  }

  function handleCancel() {
    setConfirmAction("cancel");
  }

  async function handleConfirmAction() {
    if (confirmAction === "cancel") {
      setConfirmAction(null);
      await doCancel();
      return;
    }
    if (confirmAction !== "send") return;

    let telephone: string | undefined;
    if (!user?.telephone) {
      const trimmed = telephoneInput.trim();
      if (!trimmed) {
        setTelephoneError("Un numéro est requis pour envoyer ta demande.");
        return;
      }
      telephone = trimmed;
    }
    setTelephoneError(null);
    // Reste ouverte tant que l'envoi n'a pas abouti : une erreur de
    // téléphone (BUYER_PHONE_REQUIRED / PHONE_ALREADY_USED) doit permettre de
    // corriger la saisie sans rouvrir la modale.
    const ok = await doSend(telephone);
    if (ok) setConfirmAction(null);
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuantiteChange(item, item.quantite - 1)}
                    disabled={itemActionPendingId === item.produitId || item.quantite <= 1}
                    aria-label={`Diminuer la quantité de ${item.produit.titre}`}
                    className="grid h-8 w-8 place-items-center rounded-full border border-border-strong text-[15px] text-ink transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    −
                  </button>
                  <span
                    aria-label={`Quantité de ${item.produit.titre}`}
                    className="min-w-[1.5em] text-center text-[14px] font-medium text-ink"
                  >
                    {item.quantite}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantiteChange(item, item.quantite + 1)}
                    disabled={itemActionPendingId === item.produitId}
                    aria-label={`Augmenter la quantité de ${item.produit.titre}`}
                    className="grid h-8 w-8 place-items-center rounded-full border border-border-strong text-[15px] text-ink transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    +
                  </button>
                </div>
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

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === "send" ? "Envoyer cette demande ?" : "Annuler cette demande ?"}
        description={
          confirmAction === "send" ? (
            <div className="flex flex-col gap-3">
              <p>Envoyer cette demande à {demande.interlocuteur.nom} ?</p>
              {!user?.telephone ? (
                <Input
                  label="Ton numéro de téléphone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+224 622 00 00 00"
                  value={telephoneInput}
                  onChange={(event) => {
                    setTelephoneInput(event.target.value);
                    setTelephoneError(null);
                  }}
                  error={telephoneError ?? undefined}
                  hint={telephoneError ? undefined : "Le vendeur te rappellera sur ce numéro."}
                  disabled={sending}
                  required
                />
              ) : null}
            </div>
          ) : (
            "Annuler cette demande ? Cette action est irréversible."
          )
        }
        confirmLabel={confirmAction === "send" ? "Envoyer" : "Annuler la demande"}
        cancelLabel="Retour"
        variant={confirmAction === "cancel" ? "danger" : "default"}
        busy={confirmAction === "send" ? sending : cancelling}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
