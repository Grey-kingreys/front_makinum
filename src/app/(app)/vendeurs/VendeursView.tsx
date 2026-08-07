"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Alert, Button } from "@/components/ui";
import { VendeurBadge } from "@/components/products/VendeurBadge";
import { ApiError } from "@/lib/api";
import { listVendors } from "@/lib/vendors/api";
import type { VendorListItem } from "@/lib/vendors/types";

const PAGE_SIZE = 20;

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-white p-5">
      <div className="mb-3 h-5 w-2/3 rounded bg-beige-soft" />
      <div className="mb-2 h-4 w-1/2 rounded bg-beige-soft" />
      <div className="h-3 w-1/3 rounded bg-beige-soft" />
    </div>
  );
}

function VendorCard({ vendor }: { vendor: VendorListItem }) {
  return (
    <Link
      href={`/vendeurs/${vendor.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border bg-white p-5 transition-colors hover:border-brand"
    >
      <div className="flex items-center gap-2 text-[15.5px] font-medium text-ink">
        {vendor.nom}
        <VendeurBadge statut={vendor.statutVendeur} />
      </div>
      <div className="text-[13px] text-brand-faint">
        {vendor.noteMoyenne !== null ? (
          <span>
            ★ {vendor.noteMoyenne} ({vendor.nbAvis})
          </span>
        ) : (
          <span>Pas encore d&apos;avis</span>
        )}
      </div>
      <div className="text-[12.5px] text-brand-subtle">
        {vendor.nbProduitsActifs} produit{vendor.nbProduitsActifs > 1 ? "s" : ""} actif
        {vendor.nbProduitsActifs > 1 ? "s" : ""}
      </div>
    </Link>
  );
}

/**
 * Page « Vendeurs » (/vendeurs, T39) — liste publique paginée des vendeurs
 * (GET /vendeurs) : nom, badge de statut (VendeurBadge, réutilisé tel quel),
 * note moyenne + nombre d'avis, nombre de produits actifs. Pagination « Voir
 * plus » additive, même style que ProduitsView
 * (src/app/(app)/produits/ProduitsView.tsx). Vendeurs suspendus déjà exclus
 * côté backend ; aucun téléphone dans cette liste (règle de confidentialité
 * du contrat GET /vendeurs).
 */
export function VendeursView() {
  const [items, setItems] = useState<VendorListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await listVendors({ page: targetPage, limit: PAGE_SIZE });
      setItems((prev) => (append ? [...prev, ...result.items] : result.items));
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible de charger les vendeurs. Réessaie.",
      );
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial au montage, même convention que ProduitsView.
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPage est stable (aucun filtre ici).
  }, []);

  const hasMore = items.length < total;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-[60px] pt-[28px] sm:px-8 lg:px-10">
      <div className="mb-[22px]">
        <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
          Vendeurs
        </h1>
        <p className="text-[14.5px] text-brand-subtle">
          {total} vendeur{total > 1 ? "s" : ""}
        </p>
      </div>

      {error ? (
        <Alert variant="danger" className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchPage(1, false)}>
            Réessayer
          </Button>
        </Alert>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-white px-6 py-16 text-center text-[14.5px] text-brand-subtle">
          Aucun vendeur pour l&apos;instant.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
          {hasMore ? (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => fetchPage(page + 1, true)} disabled={loadingMore}>
                {loadingMore ? "Chargement…" : "Voir plus"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
