import Link from "next/link";

import { CategoryGrid } from "@/components/landing/CategoryGrid";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { LandingHeader } from "@/components/landing/LandingHeader";

/**
 * Landing publique de Makinum — reproduit l'écran « isLanding » du
 * prototype de référence (docs/Design de marketplace locale/Makinum.dc.html) :
 * header, héros, « Comment ça marche », « La confiance ne se promet pas »,
 * puis une section catégories (« Ce qui se vend ») et le footer. Server
 * Component statique : aucun fetch, contenu figé (le listing dynamique de
 * produits/catégories arrive en T15).
 *
 * Note couleur des liens : `globals.css` définit `a`/`a:hover` hors de tout
 * `@layer` Tailwind, ce qui leur donne la priorité sur les classes
 * utilitaires `text-*`/`hover:text-*` posées sur un `<a>`/`<Link>` (une
 * déclaration non calquée l'emporte sur une déclaration calquée à poids
 * égal). D'où le modificateur `!important` (suffixe `!`) sur la couleur de
 * texte des liens ci-dessous — cf. la même remarque dans LandingHeader.
 */

const ACCENT_BUTTON =
  "inline-flex items-center justify-center rounded-lg bg-accent px-7 py-4 text-[15.5px] font-semibold text-brand! transition-colors hover:bg-accent-hover";
const OUTLINE_HERO_BUTTON =
  "inline-flex items-center justify-center rounded-lg border border-cream/28 px-[26px] py-4 text-[15.5px] text-cream! transition-colors hover:border-cream";

const STATS = [
  { value: "0 GNF", label: "de commission" },
  { value: "< 5 km", label: "tri par distance réelle" },
  { value: "3 niveaux", label: "de confiance vendeur" },
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Tu cherches près de toi",
    description: "Les résultats sont triés par distance, jamais par publicité. Le plus proche d'abord.",
  },
  {
    step: "02",
    title: "Tu envoies une demande",
    description: "Pas de panier ni de paiement : une intention d'achat qui prévient le vendeur.",
  },
] as const;

export default function Home() {
  return (
    <>
      <LandingHeader />

      <main>
        <section aria-labelledby="hero-heading" className="bg-brand px-6 py-16 text-cream sm:px-8 lg:px-12 lg:py-24">
          <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[72px]">
            <div>
              <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent/45 px-[14px] py-[7px] text-[12.5px] text-accent">
                Conakry · paiement à la livraison
              </span>

              <h1
                id="hero-heading"
                className="mb-6 text-balance font-display text-[44px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-[56px] lg:text-[68px]"
              >
                Ce qui se vend
                <br />
                près de chez toi,
                <br />
                <span className="text-accent">enfin visible.</span>
              </h1>

              <p className="mb-9 max-w-[480px] text-pretty text-[17px] leading-[1.55] text-cream/78 sm:text-[18.5px]">
                Makinum rassemble les vendeurs de ton quartier et te met en relation directement. Pas
                d&apos;intermédiaire, pas de paiement en ligne&nbsp;: tu payes à la livraison, en main propre.
              </p>

              <div className="mb-11 flex flex-col gap-3 sm:flex-row">
                <a href="#ce-qui-se-vend" className={ACCENT_BUTTON}>
                  Voir les produits près de moi
                </a>
                <Link href="/inscription" className={OUTLINE_HERO_BUTTON}>
                  Je veux vendre
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-11 gap-y-5 border-t border-cream/14 pt-[26px]">
                {STATS.map((stat) => (
                  <div key={stat.label}>
                    <div className="font-display text-[27px] font-bold">{stat.value}</div>
                    <div className="text-[13px] text-cream/55">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <HeroVisual />
          </div>
        </section>

        <section
          id="comment-ca-marche"
          aria-labelledby="how-heading"
          className="bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-[76px]"
        >
          <div className="mx-auto max-w-[1240px]">
            <h2 id="how-heading" className="mb-7 font-display text-[28px] font-bold tracking-[-0.03em] sm:text-[34px]">
              Comment ça marche
            </h2>

            <div className="grid gap-5 md:grid-cols-3">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step} className="rounded-[18px] border border-border bg-white p-[30px]">
                  <div className="mb-3.5 font-display text-[15px] font-bold text-accent">{item.step}</div>
                  <div className="mb-2.5 font-display text-[21px] font-bold tracking-[-0.02em]">{item.title}</div>
                  <p className="text-[14.5px] leading-[1.6] text-brand-subtle">{item.description}</p>
                </div>
              ))}

              <div className="rounded-[18px] bg-brand p-[30px] text-cream">
                <div className="mb-3.5 font-display text-[15px] font-bold text-accent">03</div>
                <div className="mb-2.5 font-display text-[21px] font-bold tracking-[-0.02em]">Vous vous appelez</div>
                <p className="text-[14.5px] leading-[1.6] text-cream/72">
                  Appel ou WhatsApp, vous convenez du lieu. Paiement à la livraison, hors application.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="trust-heading"
          className="border-t border-border bg-white px-6 py-16 sm:px-8 lg:px-12 lg:py-[66px]"
        >
          <div className="mx-auto grid max-w-[1240px] items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-[60px]">
            <div>
              <h2
                id="trust-heading"
                className="mb-4 font-display text-[28px] font-bold tracking-[-0.03em] text-brand sm:text-[34px]"
              >
                La confiance ne se promet pas.
                <br />
                Elle se construit.
              </h2>
              <p className="text-pretty text-[16px] leading-[1.65] text-brand-subtle">
                Statut vendeur attribué à la main par l&apos;administration, avis rattachés à une demande
                d&apos;achat réelle, signalements examinés un par un. Makinum ne touche jamais à ton argent.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
              <div className="bg-cream-alt p-6">
                <div className="mb-2.5 text-[13px] text-brand-faint">libre</div>
                <p className="text-[14px] leading-[1.55] text-brand-subtle">
                  Compte neuf, aucun badge. Visible, mais sans garantie.
                </p>
              </div>

              <div className="bg-cream-alt p-6">
                <div className="mb-2.5 flex items-center gap-[7px] text-[13px] text-brand-vivid">
                  <span className="h-[7px] w-[7px] rounded-full bg-brand-vivid" aria-hidden="true" />
                  vérifié
                </div>
                <p className="text-[14px] leading-[1.55] text-brand-subtle">
                  Identité et coordonnées contrôlées par l&apos;admin.
                </p>
              </div>

              <div className="bg-tint-accent-soft p-6">
                <div className="mb-2.5 flex items-center gap-[7px] text-[13px] text-accent-strong">
                  <span className="h-[7px] w-[7px] rounded-full bg-accent-strong" aria-hidden="true" />
                  confiance
                </div>
                <p className="text-[14px] leading-[1.55] text-accent-strong">
                  Vendeur reconnu fiable, historique propre, avis solides.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="ce-qui-se-vend"
          aria-labelledby="categories-heading"
          className="bg-cream-alt px-6 py-16 sm:px-8 lg:px-12 lg:py-[76px]"
        >
          <div className="mx-auto max-w-[1240px]">
            <h2
              id="categories-heading"
              className="mb-2.5 font-display text-[28px] font-bold tracking-[-0.03em] sm:text-[34px]"
            >
              Ce qui se vend
            </h2>
            <p className="mb-8 max-w-[560px] text-[15px] leading-[1.6] text-brand-subtle">
              Un aperçu des catégories disponibles sur Makinum. Le catalogue complet, trié par distance,
              arrive avec la recherche en ligne.
            </p>

            <CategoryGrid />
          </div>
        </section>
      </main>

      <footer className="bg-brand-deep px-6 py-9 text-[13px] text-cream/55 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>Makinum — plateforme de mise en relation. Facilitatrice, jamais intermédiaire financier.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/cgu" className="text-cream/55! transition-colors hover:text-cream!">
              CGU
            </Link>
            <Link href="/confidentialite" className="text-cream/55! transition-colors hover:text-cream!">
              Confidentialité
            </Link>
            <span>Conakry, Guinée · V1 MVP</span>
          </div>
        </div>
      </footer>
    </>
  );
}
