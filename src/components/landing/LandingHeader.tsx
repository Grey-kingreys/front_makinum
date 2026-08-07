"use client";

import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";

/**
 * En-tête public de la landing (/) — reproduit le header sticky vert marque
 * du prototype de référence (docs/Design de marketplace locale/Makinum.dc.html) :
 * logo, nav ancrée sur les sections de la page, boutons Connexion / Créer un
 * compte. Interactif (bascule du menu mobile) et auth-aware via useAuth() :
 * un utilisateur connecté voit un unique bouton « Mon espace » (→ /dashboard)
 * à la place de Connexion/Créer un compte, desktop et mobile. Pendant la
 * restauration de session (authLoading), affiche l'état déconnecté par
 * défaut — pas de flash bloquant. Le reste de la landing
 * (`src/app/page.tsx`) reste un Server Component statique.
 */

const NAV_LINKS = [
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#ce-qui-se-vend", label: "Produits" },
];

const OUTLINE_BUTTON =
  "inline-flex items-center justify-center rounded-md border border-cream/30 px-[18px] py-2.5 text-sm text-cream transition-colors hover:border-cream";
const ACCENT_BUTTON =
  "inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-accent-hover";

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  // Pendant la restauration de session, on reste sur l'état déconnecté
  // (pas de flash) : on ne bascule vers « Mon espace » qu'une fois la
  // session confirmée active.
  const isAuthenticated = !authLoading && user !== null;

  return (
    <header className="sticky top-0 z-30 border-b border-cream/35 bg-brand text-cream">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-4 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 text-cream"
          onClick={() => setOpen(false)}
        >
          <Logo variant="negatif" decorative className="h-[30px] w-auto" />
          <span className="font-display text-[20px] font-bold tracking-tight">Makinum</span>
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-[26px] text-[14.5px] md:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-cream/72 transition-colors hover:text-cream"
            >
              {link.label}
            </a>
          ))}
          <Link href="/inscription" className="text-cream/72 transition-colors hover:text-cream">
            Devenir vendeur
          </Link>
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          {isAuthenticated ? (
            <Link href="/dashboard" className={ACCENT_BUTTON}>
              Mon espace
            </Link>
          ) : (
            <>
              <Link href="/connexion" className={OUTLINE_BUTTON}>
                Connexion
              </Link>
              <Link href="/inscription" className={ACCENT_BUTTON}>
                Créer un compte
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-cream/30 text-cream md:hidden"
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">Menu</span>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
          </svg>
        </button>
      </div>

      {open ? (
        <div id="landing-mobile-nav" className="flex flex-col gap-1 border-t border-cream/10 px-6 pb-5 pt-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-2.5 text-[15px] text-cream/85 hover:bg-cream/10"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/inscription"
            className="rounded-md px-2 py-2.5 text-[15px] text-cream/85 hover:bg-cream/10"
            onClick={() => setOpen(false)}
          >
            Devenir vendeur
          </Link>
          <div className="mt-2 flex flex-col gap-2.5 border-t border-cream/10 pt-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className={cn(ACCENT_BUTTON, "w-full")}
                onClick={() => setOpen(false)}
              >
                Mon espace
              </Link>
            ) : (
              <>
                <Link href="/connexion" className={cn(OUTLINE_BUTTON, "w-full")} onClick={() => setOpen(false)}>
                  Connexion
                </Link>
                <Link href="/inscription" className={cn(ACCENT_BUTTON, "w-full")} onClick={() => setOpen(false)}>
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
