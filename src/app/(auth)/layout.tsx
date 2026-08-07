import type { ReactNode } from "react";
import Link from "next/link";

import { Logo } from "@/components/ui";

/**
 * Layout partagé des écrans d'authentification (/connexion, /inscription,
 * /verification, /recuperation) — reproduit le split-screen de l'écran
 * « Se connecter » du prototype de référence (docs/Design de marketplace
 * locale/Makinum.dc.html) : panneau gauche vert marque (logo, accroche,
 * note de bas de panneau), panneau droit crème centrant le formulaire de la
 * page active.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand px-10 py-12 text-cream md:flex lg:px-14 lg:py-14">
        <Link href="/" className="flex w-fit items-center gap-3 text-cream">
          <Logo variant="negatif" decorative className="h-[30px] w-auto" />
          <span className="font-display text-[20px] font-bold">Makinum</span>
        </Link>

        <div>
          <h1 className="mb-[18px] max-w-[400px] font-display text-[40px] font-extrabold leading-[1.04] tracking-tight">
            Ton email, un mot de passe. C&apos;est tout.
          </h1>
          <p className="max-w-[420px] text-[16px] leading-[1.6] text-cream/70">
            On vérifie ton email une seule fois par code. Ensuite tu te connectes
            normalement — pas de code à chaque fois.
          </p>
        </div>

        <p className="text-[13px] text-cream/45">
          Mot de passe haché. Aucune donnée bancaire demandée, jamais.
        </p>
      </div>

      <div className="flex items-center justify-center bg-cream px-6 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
