import { cn } from "@/lib/cn";

/**
 * Mosaïque décorative du héros — reproduit la disposition en grille du
 * prototype (image « pagne » haute à gauche, tuile ambre de distance,
 * image « téléphone » haute à droite, pastille vendeur vérifié en bas à
 * gauche). Les emplacements photo sont de simples placeholders en pointillés
 * (« dépose une photo »), pas d'images réelles. Purement illustratif :
 * masqué aux lecteurs d'écran, l'information utile est déjà portée par le
 * texte du héros.
 */

const PHOTO_SLOT =
  "flex items-end rounded-[18px] border-2 border-dashed border-cream/25 bg-brand-vivid/15 p-3 text-[11.5px] text-cream/50";

export function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="grid h-full min-h-[380px] grid-cols-2 grid-rows-3 gap-3.5 sm:min-h-[440px]"
    >
      <div className={cn(PHOTO_SLOT, "col-start-1 row-start-1 row-span-2")}>Pagne wax — dépose une photo</div>

      <div className="col-start-2 row-start-1 flex flex-col justify-between rounded-[18px] bg-accent p-5 text-brand">
        <span className="text-[13px] font-semibold">Madina</span>
        <span className="font-display text-[30px] font-bold leading-none">1,2 km</span>
      </div>

      <div className={cn(PHOTO_SLOT, "col-start-2 row-start-2 row-span-2")}>Téléphone — dépose une photo</div>

      <div className="col-start-1 row-start-3 flex flex-col justify-between rounded-[18px] bg-cream p-[18px] text-ink">
        <span className="flex items-center gap-1.5 text-[12.5px] text-brand-vivid">
          <span className="h-[7px] w-[7px] rounded-full bg-brand-vivid" />
          vendeur vérifié
        </span>
        <span className="text-[14px] font-semibold">Fatoumata B.</span>
      </div>
    </div>
  );
}
