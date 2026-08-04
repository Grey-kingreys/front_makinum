import Link from "next/link";

import { formatPrixGNF } from "@/lib/format";
import type { ProductSearchItem } from "@/lib/products/types";

import { PhotoPlaceholder } from "./PhotoPlaceholder";
import { VendeurBadge } from "./VendeurBadge";

/**
 * Carte produit de la grille « Près de toi, maintenant » — fidèle au
 * prototype : zone photo avec badge distance, titre, prix, ligne vendeur
 * (nom + badge statut), note si disponible.
 */
export function ProductCard({ item }: { item: ProductSearchItem }) {
  return (
    <Link
      href={`/produits/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white transition-colors hover:border-brand"
    >
      <div className="relative h-[168px] shrink-0">
        {item.miniature ? (
          // eslint-disable-next-line @next/next/no-img-element -- miniatures backend d'origine/domaine variable, pas de config next/image en V1.
          <img src={item.miniature} alt={item.titre} className="h-full w-full object-cover" />
        ) : (
          <PhotoPlaceholder />
        )}
        {item.distanceKm !== null ? (
          <span className="absolute right-[11px] top-[11px] rounded-full bg-ink/80 px-[10px] py-[5px] text-[12px] text-cream">
            {item.distanceKm} km
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-[15px] pb-4 pt-[14px]">
        <div className="text-[15px] font-medium leading-snug text-ink">{item.titre}</div>
        <div className="font-display text-[19px] font-bold text-brand">{formatPrixGNF(item.prix)}</div>
        <div className="mt-auto flex items-center gap-[7px] text-[12.5px] text-brand-subtle">
          <span>{item.vendeur.nom}</span>
          <VendeurBadge statut={item.vendeur.statutVendeur} />
        </div>
        {item.vendeur.noteMoyenne !== null ? (
          <div className="text-[12.5px] text-brand-faint">
            ★ {item.vendeur.noteMoyenne} ({item.vendeur.nbAvis})
          </div>
        ) : null}
      </div>
    </Link>
  );
}
