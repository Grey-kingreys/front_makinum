import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

const BUTTON_CLASSES =
  "rounded-[11px] border border-border-strong bg-white px-4 py-[13px] text-center text-[14px] text-ink transition-colors hover:border-brand";

export interface ContactButtonsProps extends ComponentProps<"div"> {
  /** Numéro brut (avec indicatif) — jamais rendu si absent : appelant. */
  telephone: string;
}

/**
 * Boutons « Appeler » / « WhatsApp », motif partagé par les fiches produit
 * et vendeur (T16/T39) et par les cartes de demande (T43) : `tel:` avec le
 * numéro tel quel, `wa.me` avec le numéro nettoyé de ses non-chiffres.
 * N'affiche rien de conditionnel elle-même — c'est à l'appelant de ne monter
 * ce composant que lorsqu'un numéro est disponible.
 */
export function ContactButtons({ telephone, className, ...props }: ContactButtonsProps) {
  const whatsappNumber = telephone.replace(/\D/g, "");

  return (
    <div className={cn("grid grid-cols-2 gap-2.5", className)} {...props}>
      <a href={`tel:${telephone}`} className={BUTTON_CLASSES}>
        Appeler
      </a>
      <a
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        className={BUTTON_CLASSES}
      >
        WhatsApp
      </a>
    </div>
  );
}
