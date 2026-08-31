import Link from "next/link";
import type { Metadata } from "next";
import { EllipsisVertical } from "lucide-react";

import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY, SUPPORT_WHATSAPP_URL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Aide",
  description: "Aide et support Makinum : comment acheter, comment vendre, installer l'application, nous contacter.",
};

export default function AidePage() {
  return (
    <>
      <main className="bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1240px]">
          <h1 className="mb-12 font-display text-[44px] font-extrabold tracking-[-0.035em] sm:text-[56px]">
            Aide
          </h1>

          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-1">
            {/* Comment acheter */}
            <section className="rounded-2xl border border-border bg-white p-8">
              <h2 className="mb-4 font-display text-[24px] font-bold tracking-[-0.02em]">Comment acheter</h2>
              <p className="text-[15px] leading-[1.6] text-brand-subtle">
                Cherche un produit près de chez toi. Les résultats sont triés par distance réelle, jamais par
                publicité. Ajoute le produit à ta demande. Le vendeur reçoit ta demande et t&apos;appelle. Vous convenez
                du lieu et de l&apos;horaire. Tu payes à la livraison, en main propre. Aucun paiement en ligne sur
                Makinum.
              </p>
            </section>

            {/* Comment vendre */}
            <section className="rounded-2xl border border-border bg-white p-8">
              <h2 className="mb-4 font-display text-[24px] font-bold tracking-[-0.02em]">Comment vendre</h2>
              <p className="text-[15px] leading-[1.6] text-brand-subtle">
                Crée un compte vendeur — ton numéro de téléphone sera ton canal de contact avec les acheteurs.
                Un administrateur valide ton compte. Publie tes produits avec photos et position géographique.
                Astuce : règle « Mon lieu de vente » dans tes paramètres, il pré-remplit chaque publication.
              </p>
            </section>

            {/* Installer l'application */}
            <section className="rounded-2xl border border-border bg-white p-8">
              <h2 className="mb-4 font-display text-[24px] font-bold tracking-[-0.02em]">Installer l&apos;application</h2>
              <div className="space-y-3 text-[15px] leading-[1.6] text-brand-subtle">
                <p>
                  <strong>Android / Chrome</strong> : accepte l&apos;invitation « Installer Makinum » en haut de
                  l&apos;écran, ou utilise le menu{" "}
                  <EllipsisVertical className="inline h-4 w-4 align-text-bottom" aria-hidden="true" /> (trois
                  points) puis « Ajouter à l&apos;écran d&apos;accueil ».
                </p>
                <p>
                  <strong>iPhone / Safari</strong> : appuie sur le bouton Partager (carré avec flèche) puis « Sur
                  l&apos;écran d&apos;accueil ».
                </p>
              </div>
            </section>

            {/* Nous contacter */}
            <section className="rounded-2xl border border-border bg-white p-8">
              <h2 className="mb-6 font-display text-[24px] font-bold tracking-[-0.02em]">Nous contacter</h2>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-brand-muted">WhatsApp</p>
                  <Link
                    href={SUPPORT_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg bg-accent px-5 py-3 text-[15px] font-semibold text-brand transition-colors hover:bg-accent-hover"
                  >
                    Écris-nous sur WhatsApp
                  </Link>
                  <p className="mt-2 text-[14px] text-brand-subtle">{SUPPORT_WHATSAPP_DISPLAY}</p>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-brand-muted">Email</p>
                  <Link
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-[15px] text-accent transition-colors hover:text-accent-hover"
                  >
                    {SUPPORT_EMAIL}
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="bg-brand-deep px-6 py-9 text-[13px] text-cream/55 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>Makinum — plateforme de mise en relation. Facilitatrice, jamais intermédiaire financier.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/aide" className="text-cream/55 transition-colors hover:text-cream">
              Aide
            </Link>
            <Link href="/cgu" className="text-cream/55 transition-colors hover:text-cream">
              CGU
            </Link>
            <Link href="/confidentialite" className="text-cream/55 transition-colors hover:text-cream">
              Confidentialité
            </Link>
            <span>Conakry, Guinée</span>
          </div>
        </div>
      </footer>
    </>
  );
}
