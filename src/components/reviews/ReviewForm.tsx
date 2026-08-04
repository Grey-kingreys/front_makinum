"use client";

import { useState } from "react";

import { Alert } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { createReview, describeReviewError } from "@/lib/reviews";
import type { ReviewView } from "@/lib/reviews";

const NOTES = [1, 2, 3, 4, 5] as const;

interface ReviewFormProps {
  purchaseRequestId: string;
  /** Succès : le parent remplace ce formulaire par l'état « Avis envoyé ». */
  onSubmitted: (review: ReviewView) => void;
  /** REVIEW_ALREADY_EXISTS : le parent masque le bouton avec une mention. */
  onAlreadyExists: () => void;
  onCancel: () => void;
}

/**
 * Formulaire « Comment s'est passé l'échange ? » (écran isReview du
 * prototype, docs/Design de marketplace locale/Makinum.dc.html) — note 1-5
 * obligatoire et commentaire optionnel (max 1000). Le sélecteur de note
 * utilise des boutons radio natifs regroupés par `name` : Tab amène le focus
 * dans le groupe, les flèches déplacent et sélectionnent — clavier
 * accessible sans JavaScript supplémentaire. REVIEW_ALREADY_EXISTS et le
 * succès sont remontés au parent (DemandeCard) qui remplace ce formulaire ;
 * les autres erreurs (REQUEST_NOT_CLOSED, réseau…) restent affichées ici
 * pour permettre de réessayer.
 */
export function ReviewForm({ purchaseRequestId, onSubmitted, onAlreadyExists, onCancel }: ReviewFormProps) {
  const [note, setNote] = useState<number | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (note === null) {
      setError("Choisis une note avant d'envoyer ton avis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const review = await createReview({
        purchaseRequestId,
        note,
        commentaire: commentaire.trim() ? commentaire.trim() : undefined,
      });
      onSubmitted(review);
    } catch (err) {
      if (err instanceof ApiError && err.code === "REVIEW_ALREADY_EXISTS") {
        onAlreadyExists();
        return;
      }
      setError(describeReviewError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-beige px-5 py-5">
      <div className="mb-1 font-display text-[16px] font-bold text-ink">
        Comment s&apos;est passé l&apos;échange ?
      </div>
      <p className="mb-4 text-[12.5px] leading-relaxed text-brand-faint">
        Ton avis est rattaché à cette demande — un seul avis par demande, c&apos;est ce qui empêche
        les faux avis.
      </p>

      <fieldset className="mb-4">
        <legend className="mb-2 text-[13px] text-brand-muted">Ta note</legend>
        <div className="flex gap-2">
          {NOTES.map((value) => {
            const checked = note === value;
            return (
              <label
                key={value}
                className={cn(
                  "grid h-11 w-11 cursor-pointer place-items-center rounded-xl border text-[20px] transition-colors",
                  checked
                    ? "border-accent bg-tint-accent text-accent-strong"
                    : "border-border-strong text-brand-faint hover:border-brand",
                )}
              >
                <input
                  type="radio"
                  name={`note-${purchaseRequestId}`}
                  value={value}
                  checked={checked}
                  onChange={() => {
                    setNote(value);
                    setError(null);
                  }}
                  className="sr-only"
                />
                <span aria-hidden="true">★</span>
                <span className="sr-only">
                  {value} étoile{value > 1 ? "s" : ""}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mb-4">
        <label
          htmlFor={`commentaire-${purchaseRequestId}`}
          className="mb-2 block text-[13px] text-brand-muted"
        >
          Commentaire (optionnel)
        </label>
        <textarea
          id={`commentaire-${purchaseRequestId}`}
          value={commentaire}
          onChange={(event) => setCommentaire(event.target.value)}
          maxLength={1000}
          placeholder="Produit conforme, vendeur ponctuel au rendez-vous."
          className="min-h-[100px] w-full resize-y rounded-md border border-border-strong bg-white px-3.5 py-3 text-[14.5px] text-ink outline-none placeholder:text-brand-placeholder focus-visible:shadow-focus-brand"
        />
      </div>

      {error ? (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          aria-busy={submitting}
          className="flex-1 rounded-[11px] bg-brand px-4 py-3 text-[14.5px] font-semibold text-cream transition-colors hover:bg-brand-vivid disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Envoi…" : "Publier mon avis"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-[11px] border border-border-strong bg-white px-4 py-3 text-[14.5px] text-ink transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
