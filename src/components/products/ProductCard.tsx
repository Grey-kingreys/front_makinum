import Link from "next/link";

import { formatPrixGNF } from "@/lib/format";
import type { ProductSearchItem } from "@/lib/products/types";

import { PhotoPlaceholder } from "./PhotoPlaceholder";
import { VendeurBadge } from "./VendeurBadge";

/**
 * Carte produit de la grille « Près de toi, maintenant » — fidèle au
 * prototype : zone photo avec badge distance, titre, prix, ligne vendeur
 * (nom + badge statut), note si disponible.
 *
 * `distanceKm` est `null` soit parce que l'acheteur n'a pas partagé sa
 * position, soit — depuis T38b — parce que le produit lui-même n'a pas de
 * coordonnées (le backend ne les masque plus). Dans les deux cas, le badge
 * distance est remplacé par une mention neutre au même emplacement : jamais
 * de « — km »/« 0 km » qui laisserait croire à une distance connue.
 *
 * Cette carte est alimentée par plusieurs sources (recherche, fiche
 * vendeur…) qui ne respectent pas toutes exactement le contrat
 * `ProductSearchItem` à l'exécution — un champ optionnel peut donc arriver
 * en `undefined` plutôt qu'en `null`. Tous les champs nullables sont donc
 * testés avec `== null` / `!= null` (comparaison lâche, volontaire) pour
 * couvrir les deux cas et toujours retomber sur l'état de repli plutôt que
 * d'afficher un libellé orphelin (« km » sans nombre, « ★ () » vide…).
 */
export function ProductCard({ item }: { item: ProductSearchItem }) {
  const hasNote = item.vendeur.noteMoyenne != null && item.vendeur.nbAvis != null;
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
        {item.distanceKm != null ? (
          <span className="absolute right-[11px] top-[11px] rounded-full bg-ink/80 px-[10px] py-[5px] text-[12px] text-cream">
            {item.distanceKm} km
          </span>
        ) : (
          <span className="absolute right-[11px] top-[11px] max-w-[calc(100%-22px)] rounded-md bg-ink/60 px-[9px] py-[4px] text-right text-[11px] leading-snug text-cream/90">
            Localisation non précisée
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-[15px] pb-4 pt-[14px]">
        <div className="text-[15px] font-medium leading-snug text-ink">{item.titre}</div>
        <div className="font-display text-[19px] font-bold text-brand">{formatPrixGNF(item.prix)}</div>
        <div className="mt-auto flex items-center gap-[7px] text-[12.5px] text-brand-subtle">
          <span>{item.vendeur.nom}</span>
          <VendeurBadge statut={item.vendeur.statutVendeur} />
        </div>
        {hasNote ? (
          <div className="text-[12.5px] text-brand-faint">
            ★ {item.vendeur.noteMoyenne} ({item.vendeur.nbAvis})
          </div>
        ) : null}
      </div>
    </Link>
  );
}
