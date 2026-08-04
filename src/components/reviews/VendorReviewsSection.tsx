"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { describeReviewError, listVendeurReviews } from "@/lib/reviews";
import type { VendeurReviewItem } from "@/lib/reviews";

/** 3 avis affichés d'emblée (fiche produit) — même granularité que la
 * pagination du panneau « Voir plus ». */
const PAGE_SIZE = 3;

interface VendorReviewsSectionProps {
  vendeurId: string;
}

/**
 * Section « Avis sur ce vendeur » de la fiche produit — écran isProduct du
 * prototype (docs/Design de marketplace locale/Makinum.dc.html) : GET
 * /vendeurs/:id/avis, 3 premiers avis puis pagination additive (« Voir
 * plus »). La moyenne/nb d'avis déjà affichés dans la carte vendeur
 * (product.vendeur.noteMoyenne/nbAvis, ProductDetail.tsx) restent
 * inchangés ; cette section n'ajoute que le détail des avis individuels,
 * en dessous.
 */
export function VendorReviewsSection({ vendeurId }: VendorReviewsSectionProps) {
  const [items, setItems] = useState<VendeurReviewItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await listVendeurReviews(vendeurId, { page: targetPage, limit: PAGE_SIZE });
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setTotal(result.total);
        setPage(result.page);
      } catch (err) {
        setError(describeReviewError(err, "Impossible de charger les avis de ce vendeur."));
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [vendeurId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial au montage, même convention que ProduitsView/CatalogueView.
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load() dépend de vendeurId, une seule tentative par vendeur au montage.
  }, [vendeurId]);

  const hasMore = items.length < total;

  return (
    <div className="mt-[30px] border-t border-beige pt-6">
      <h2 className="mb-4 font-display text-[19px] font-bold text-ink">Avis sur ce vendeur</h2>

      {error ? (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 rounded-[13px] bg-beige-soft" />
          <div className="h-16 rounded-[13px] bg-beige-soft" />
        </div>
      ) : items.length === 0 && !error ? (
        <p className="text-[14px] text-brand-subtle">Ce vendeur n&apos;a pas encore reçu d&apos;avis.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((review, index) => (
            <li
              key={`${review.dateCreation}-${index}`}
              className="rounded-[13px] border border-border bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[14px] font-medium text-ink">{review.auteur.nom}</span>
                <span
                  className="text-[13px] text-accent-strong"
                  aria-label={`${review.note} étoile${review.note > 1 ? "s" : ""} sur 5`}
                >
                  <span aria-hidden="true">
                    {"★".repeat(review.note)}
                    {"☆".repeat(5 - review.note)}
                  </span>
                </span>
              </div>
              {review.commentaire ? (
                <p className="mb-1 text-[14px] leading-relaxed text-brand-subtle">
                  {review.commentaire}
                </p>
              ) : null}
              <p className="text-[12px] text-brand-faint">{formatDate(review.dateCreation)}</p>
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <button
          type="button"
          onClick={() => load(page + 1, true)}
          disabled={loadingMore}
          aria-busy={loadingMore}
          className="mt-4 text-[13.5px] font-medium text-brand underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingMore ? "Chargement…" : "Voir plus"}
        </button>
      ) : null}
    </div>
  );
}
