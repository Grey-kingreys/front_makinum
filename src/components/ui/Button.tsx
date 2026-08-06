import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "accent" | "outline" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ComponentProps<"button"> {
  /** vert marque (défaut), ambre accent, contour neutre, ou rouge (action destructrice). */
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-cream font-semibold hover:bg-brand-vivid focus-visible:shadow-focus-brand",
  accent:
    "bg-accent text-brand font-semibold hover:bg-accent-hover focus-visible:shadow-focus-accent",
  outline:
    "bg-white text-ink font-medium border border-border-strong hover:border-brand focus-visible:shadow-focus-brand",
  danger:
    "bg-danger text-cream font-semibold hover:bg-danger-vivid focus-visible:shadow-focus-danger",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "rounded-md px-4 py-2.5 text-sm",
  md: "rounded-md px-5 py-3.5 text-[15px]",
  lg: "rounded-lg px-7 py-4 text-[15.5px]",
};

/**
 * Bouton primitif du design system Makinum. Server Component par défaut :
 * les gestionnaires d'événements (`onClick`, etc.) ne sont valides que
 * lorsqu'il est rendu depuis un arbre client (ex. un formulaire de connexion).
 * React 19 transmet `ref` comme une prop normale, sans `forwardRef`.
 */
export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap transition-colors duration-150 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
