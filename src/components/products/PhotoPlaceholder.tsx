import { cn } from "@/lib/cn";

/**
 * Placeholder pointillé pour un produit sans photo — reprend le style de
 * l'anneau en pointillés du prototype (`image-slot`, état vide) sans en
 * réutiliser le composant (outil d'édition du design, pas destiné au runtime).
 */
export function PhotoPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-[inherit] border-2 border-dashed border-border-strong bg-cream-alt text-[12px] text-brand-faint",
        className,
      )}
    >
      Pas de photo
    </div>
  );
}
