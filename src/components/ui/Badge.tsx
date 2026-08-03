import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Variantes alignées sur `statutVendeur` (backend) + variantes neutres
 * génériques. `verifie`/`confiance` reprennent les teintes du prototype
 * (vert vif / ambre foncé), `libre` et `neutral` un gris chaud discret.
 */
export type BadgeVariant = "verifie" | "confiance" | "libre" | "neutral" | "danger";

export interface BadgeProps extends ComponentProps<"span"> {
  variant?: BadgeVariant;
  /** Affiche le point de statut plein (comme dans le prototype). */
  dot?: boolean;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  verifie: "bg-tint-brand text-brand-vivid border border-tint-brand-border",
  confiance: "bg-tint-accent text-accent-strong border border-tint-accent-border",
  libre: "bg-beige-soft text-brand-subtle border border-border",
  neutral: "bg-beige-soft text-brand-subtle border border-border",
  danger: "bg-tint-danger text-danger border border-tint-danger-border",
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  verifie: "bg-brand-vivid",
  confiance: "bg-accent-strong",
  libre: "bg-brand-faint",
  neutral: "bg-brand-faint",
  danger: "bg-danger",
};

export function Badge({ variant = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[6px] rounded-full px-[11px] py-[4px] text-[12.5px] font-normal",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {dot ? <span className={cn("h-[6px] w-[6px] rounded-full", DOT_CLASSES[variant])} /> : null}
      {children}
    </span>
  );
}
