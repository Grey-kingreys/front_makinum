import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export interface CardProps extends ComponentProps<"div"> {
  /** Ombre douce au survol (listes de produits, éléments cliquables). */
  hoverable?: boolean;
  /** Coins plus généreux (18px), pour les panneaux principaux. */
  padded?: boolean;
}

/**
 * Conteneur de base du design system : fond blanc, bordure fine crème,
 * coins bien arrondis — reprend les cartes du prototype (produits, stats,
 * panneaux de formulaire).
 */
export function Card({ hoverable = false, padded = true, className, ref, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-white",
        padded && "p-6",
        hoverable && "transition-colors duration-150 hover:border-brand hover:shadow-soft",
        className,
      )}
      {...props}
    />
  );
}
