"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alert, Button } from "@/components/ui";
import { VendorProductCard } from "@/components/products/VendorProductCard";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import {
  getMyProducts,
  MAX_PRODUITS_ACTIFS,
  updateProduct,
} from "@/lib/products/vendor-api";
import type { ProductView } from "@/lib/products/types";

/** Jauge avertit visuellement dès qu'il ne reste plus que 2 emplacements. */
const SEUIL_ALERTE_ACTIFS = MAX_PRODUITS_ACTIFS - 2;

const PRIMARY_LINK_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-md bg-brand px-5 py-3.5 text-[15px] font-semibold text-cream transition-colors hover:bg-brand-vivid focus-visible:outline-none focus-visible:shadow-focus-brand";

const VALIDATION_PENDING_MESSAGE =
  "Ton compte vendeur doit être validé par un administrateur avant de publier un produit.";

/**
 * « Publier un produit » — lien actif une fois le compte validé, sinon
 * remplacé par un élément désactivé avec l'explication à côté (T30) : évite
 * que le vendeur atteigne le formulaire pour se prendre un refus (filet de
 * sécurité côté formulaire malgré tout, voir describeCreateError).
 */
function PublishProductLink({ label, disabled }: { label: string; disabled: boolean }) {
  if (disabled) {
    return (
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <span
          aria-disabled="true"
          title={VALIDATION_PENDING_MESSAGE}
          className={cn(PRIMARY_LINK_CLASSES, "cursor-not-allowed bg-beige-soft text-brand-faint hover:bg-beige-soft")}
        >
          {label}
        </span>
        <p className="text-[12.5px] text-brand-faint">{VALIDATION_PENDING_MESSAGE}</p>
      </div>
    );
  }

  return (
    <Link href="/vendeur/produits/nouveau" className={PRIMARY_LINK_CLASSES}>
      {label}
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-border bg-white">
      <div className="h-[168px] bg-beige-soft" />
      <div className="flex flex-col gap-2 px-[15px] pb-4 pt-[14px]">
        <div className="h-4 w-3/4 rounded bg-beige-soft" />
        <div className="h-5 w-1/2 rounded bg-beige-soft" />
        <div className="h-3 w-2/3 rounded bg-beige-soft" />
      </div>
    </div>
  );
}

/**
 * « Mon catalogue » (/vendeur/catalogue) — écran isSeller du prototype
 * (docs/Design de marketplace locale/Makinum.dc.html), adapté en grille de
 * cartes (comme /produits, T15) plutôt qu'en tableau : jauge « X/30 produits
 * actifs », produits actifs et inactifs (grisés + badge), actions Modifier /
 * Désactiver-Réactiver.
 */
export function CatalogueView() {
  const { user } = useAuth();
  const publishDisabled = user?.role === "VENDEUR" && user.vendeurValide === false;

  const [products, setProducts] = useState<ProductView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getMyProducts();
      setProducts(list);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible de charger ton catalogue. Réessaie.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial au montage (même convention que ProduitsView.tsx, T15).
    fetchProducts();
  }, [fetchProducts]);

  async function handleToggle(product: ProductView) {
    setTogglingId(product.id);
    setToggleErrors((prev) => ({ ...prev, [product.id]: "" }));
    try {
      const updated = await updateProduct(product.id, { actif: !product.actif });
      setProducts((prev) => prev?.map((item) => (item.id === product.id ? updated : item)) ?? prev);
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === "PRODUCT_LIMIT_REACHED"
          ? `Limite de ${MAX_PRODUITS_ACTIFS} produits actifs atteinte : désactive un autre produit avant de réactiver celui-ci.`
          : err instanceof ApiError
            ? err.message
            : "Impossible de mettre à jour ce produit. Réessaie.";
      setToggleErrors((prev) => ({ ...prev, [product.id]: message }));
    } finally {
      setTogglingId(null);
    }
  }

  const activeCount = products?.filter((product) => product.actif).length ?? 0;
  const gaugePct = Math.min(100, Math.round((activeCount / MAX_PRODUITS_ACTIFS) * 100));
  const nearLimit = activeCount >= SEUIL_ALERTE_ACTIFS;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-[60px] pt-[28px] sm:px-8 lg:px-10">
      <div className="mb-[22px] flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
            Mon catalogue
          </h1>
          <p className="text-[14.5px] text-brand-subtle">
            {products ? `${products.length} produit${products.length > 1 ? "s" : ""} au total` : "…"}
          </p>
        </div>
        <PublishProductLink label="Publier un produit" disabled={publishDisabled} />
      </div>

      <div className="mb-6 rounded-xl border border-border bg-white p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[13px] text-brand-subtle">Produits actifs</span>
          <span
            className={cn(
              "font-display text-[17px] font-bold",
              nearLimit ? "text-danger" : "text-brand",
            )}
          >
            {activeCount}{" "}
            <span className="text-[13px] font-normal text-brand-faint">/ {MAX_PRODUITS_ACTIFS}</span>
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Produits actifs"
          aria-valuemin={0}
          aria-valuemax={MAX_PRODUITS_ACTIFS}
          aria-valuenow={activeCount}
          className="h-[6px] rounded-full bg-beige-soft"
        >
          <div
            className={cn("h-full rounded-full", nearLimit ? "bg-danger" : "bg-brand")}
            style={{ width: `${gaugePct}%` }}
          />
        </div>
        {nearLimit ? (
          <p className="mt-2 text-[12.5px] text-danger">
            Tu approches la limite de {MAX_PRODUITS_ACTIFS} produits actifs — désactive un produit
            pour libérer une place.
          </p>
        ) : null}
      </div>

      {error ? (
        <Alert variant="danger" className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchProducts()}>
            Réessayer
          </Button>
        </Alert>
      ) : null}

      {loading && !products ? (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : products && products.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-white px-6 py-16 text-center">
          <p className="mb-4 text-[14.5px] text-brand-subtle">
            Tu n&apos;as encore publié aucun produit.
          </p>
          <div className="flex justify-center">
            <PublishProductLink label="Publier mon premier produit" disabled={publishDisabled} />
          </div>
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <VendorProductCard
              key={product.id}
              product={product}
              toggling={togglingId === product.id}
              toggleError={toggleErrors[product.id] || undefined}
              onToggle={() => handleToggle(product)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
