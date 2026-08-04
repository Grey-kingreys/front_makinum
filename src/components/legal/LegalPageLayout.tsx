import type { ReactNode } from "react";
import Link from "next/link";

import { Alert } from "@/components/ui";

export interface LegalTocEntry {
  /** Doit correspondre à l'`id` du <h2> de la section dans le contenu. */
  id: string;
  label: string;
}

export interface LegalPageLayoutProps {
  title: string;
  /** Date de dernière mise à jour, au format ISO (ex. "2026-08-04"). */
  lastUpdated: string;
  sommaire?: LegalTocEntry[];
  children: ReactNode;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(isoDate: string): string {
  // new Date("2026-08-04") est interprété en UTC ; on force midi pour éviter
  // qu'un fuseau négatif ne fasse basculer l'affichage sur la veille.
  const date = new Date(`${isoDate}T12:00:00`);
  return DATE_FORMATTER.format(date);
}

/**
 * Gabarit partagé des pages légales statiques (/cgu, /confidentialite) :
 * lien de retour, titre + date de mise à jour, encart de statut « document
 * de travail », sommaire ancré optionnel, puis le contenu de la page.
 *
 * Volontairement un composant React « normal » (pas un layout.tsx du App
 * Router) : chaque page l'appelle directement, si bien que le titre et
 * l'encart sont présents dès qu'on rend le composant de page en test, sans
 * dépendre du rendu de layout de Next.js.
 */
export function LegalPageLayout({ title, lastUpdated, sommaire, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-full bg-cream px-6 py-12 sm:px-10">
      <div className="mx-auto w-full max-w-[720px]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13.5px] font-medium text-brand-subtle hover:text-brand-vivid"
        >
          ← Retour à l&apos;accueil
        </Link>

        <header className="mt-8">
          <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-tight text-ink sm:text-[38px]">
            {title}
          </h1>
          <p className="mt-2 text-[13.5px] text-brand-faint">
            Dernière mise à jour&nbsp;: {formatDate(lastUpdated)}
          </p>
        </header>

        <Alert variant="neutral" className="mt-6">
          Document de travail — à faire relire par un conseil juridique avant mise en production.
        </Alert>

        {sommaire && sommaire.length > 0 ? (
          <nav aria-label="Sommaire" className="mt-8 rounded-xl border border-border bg-white p-5">
            <p className="font-display text-[13px] font-bold uppercase tracking-wide text-brand-muted">
              Sommaire
            </p>
            <ol className="mt-3 space-y-1.5 text-[14px]">
              {sommaire.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-brand hover:text-accent-strong">
                    {index + 1}. {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="prose-legal mt-8 space-y-8 text-[15px] leading-relaxed text-brand-muted">
          {children}
        </div>
      </div>
    </div>
  );
}

export interface LegalSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

/** Un bloc de section (titre ancré + paragraphes) pour le contenu des pages légales. */
export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-display text-[19px] font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
