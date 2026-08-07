import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Marque Makinum (T41). Tracés repris tels quels de
 * `public/brand/makinum-mark-*.svg` (viewBox compris) — ces fichiers restent
 * la source de vérité visuelle ; ne pas les régénérer à la main ailleurs.
 *
 * couleur  : vert + ambre (fond clair, usage par défaut).
 * mono     : tout vert (fond clair, usage monochrome).
 * blanc    : tout crème (fond sombre).
 * negatif  : crème + ambre (fond sombre, garde le contraste des deux tons).
 */
export type LogoVariant = "couleur" | "mono" | "blanc" | "negatif";

export interface LogoProps extends ComponentProps<"svg"> {
  variant?: LogoVariant;
  /**
   * À passer quand le mot « Makinum » est déjà affiché en texte à côté
   * (cas des en-têtes) : masque le SVG aux lecteurs d'écran pour éviter la
   * double annonce. Sinon le composant s'annonce lui-même (role="img" +
   * aria-label="Makinum").
   */
  decorative?: boolean;
}

const STROKE_COLORS: Record<LogoVariant, { left: string; right: string }> = {
  couleur: { left: "#0F3D2E", right: "#E8A33D" },
  mono: { left: "#0F3D2E", right: "#0F3D2E" },
  blanc: { left: "#F7F4EE", right: "#F7F4EE" },
  negatif: { left: "#F7F4EE", right: "#E8A33D" },
};

/**
 * Rendu en SVG inline (pas de balise `<img>`) : hérite du flux de couleurs
 * ci-dessus et reste net à toute taille. La taille se pilote entièrement via
 * `className` (ex. `h-[30px] w-auto`) — le composant ne fixe aucune taille
 * par défaut, seule la viewBox d'origine (donc le ratio) est conservée.
 */
export function Logo({ variant = "couleur", decorative = false, className, ...props }: LogoProps) {
  const { left, right } = STROKE_COLORS[variant];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="2 14 122 84"
      className={cn(className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Makinum"}
      aria-hidden={decorative ? "true" : undefined}
      {...props}
    >
      <path
        d="M12 88 L38 24 L64 88"
        fill="none"
        stroke={left}
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M62 88 L88 24 L114 88"
        fill="none"
        stroke={right}
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
