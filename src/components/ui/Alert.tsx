import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Bandeau de retour formulaire (erreur / succès / info neutre). Introduit
 * pour les écrans d'authentification (T14) : les 4 formulaires (connexion,
 * inscription, vérification, récupération) ont tous besoin d'annoncer un
 * message d'erreur ou de succès au-dessus des champs, avec la même palette
 * que les teintes de statut déjà définies dans les tokens (`tint-danger`,
 * `tint-brand`) — ajouté aux primitives plutôt que dupliqué dans chaque
 * formulaire.
 */
export type AlertVariant = "danger" | "success" | "neutral";

export interface AlertProps extends ComponentProps<"div"> {
  variant?: AlertVariant;
}

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  danger: "bg-tint-danger border-tint-danger-border text-danger",
  success: "bg-tint-brand border-tint-brand-border text-brand-vivid",
  neutral: "bg-beige-soft border-border text-brand-muted",
};

export function Alert({ variant = "neutral", className, children, ...props }: AlertProps) {
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-4 py-3 text-[13.5px] leading-relaxed",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
