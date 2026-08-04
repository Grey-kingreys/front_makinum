import Link from "next/link";

import { cn } from "@/lib/cn";
import { formatPrixGNF } from "@/lib/format";
import { MAX_PHOTOS_PAR_PRODUIT } from "@/lib/products/vendor-api";
import type { ProductView } from "@/lib/products/types";

import { PhotoPlaceholder } from "./PhotoPlaceholder";

/**
 * Carte du catalogue vendeur (/vendeur/catalogue) — variante de ProductCard
 * (grille acheteur) : produit potentiellement inactif (grisé + badge
 * « Désactivé »), actions Modifier / Désactiver-Réactiver au lieu d'un lien
 * vers la fiche publique.
 */
interface VendorProductCardProps {
  product: ProductView;
  toggling: boolean;
  toggleError?: string;
  onToggle: () => void;
}

export function VendorProductCard({
  product,
  toggling,
  toggleError,
  onToggle,
}: VendorProductCardProps) {
  const cover = [...product.photos].sort((a, b) => a.ordre - b.ordre)[0] ?? null;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-white",
        !product.actif && "opacity-70",
      )}
    >
      <div className="relative h-[168px] shrink-0">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- miniatures backend, pas de config next/image en V1.
          <img src={cover.urlMiniature} alt={product.titre} className="h-full w-full object-cover" />
        ) : (
          <PhotoPlaceholder />
        )}
        {!product.actif ? (
          <span className="absolute left-[11px] top-[11px] rounded-full bg-ink/80 px-[10px] py-[5px] text-[12px] text-cream">
            Désactivé
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-[15px] pb-4 pt-[14px]">
        <div className="text-[15px] font-medium leading-snug text-ink">{product.titre}</div>
        <div className="font-display text-[19px] font-bold text-brand">
          {formatPrixGNF(product.prix)}
        </div>
        <div className="text-[12.5px] text-brand-subtle">
          {product.categorie.nom} · {product.photos.length}/{MAX_PHOTOS_PAR_PRODUIT} photos
        </div>
        {toggleError ? <p className="text-[12.5px] text-danger">{toggleError}</p> : null}
        <div className="mt-auto flex gap-2 pt-2">
          <Link
            href={`/vendeur/produits/${product.id}`}
            className="flex-1 rounded-md border border-border-strong bg-white px-3 py-2 text-center text-[13.5px] text-ink transition-colors hover:border-brand"
          >
            Modifier
          </Link>
          <button
            type="button"
            onClick={onToggle}
            disabled={toggling}
            aria-busy={toggling}
            className="flex-1 cursor-pointer rounded-md border border-border-strong bg-white px-3 py-2 text-center text-[13.5px] text-ink transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            {toggling ? "…" : product.actif ? "Désactiver" : "Réactiver"}
          </button>
        </div>
      </div>
    </div>
  );
}
