"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/ui";
import { buildInscriptionHref, buildLoginHref } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { useGeo } from "@/lib/geo";
import { initialsFromName } from "@/lib/format";
import { useDemandes, useDemandesRecues } from "@/lib/purchase-requests";
import type { PublicUser } from "@/lib/auth/types";

import { NotificationBell } from "./NotificationBell";
import { SearchField } from "./SearchField";

/**
 * Sidebar applicative — reproduit l'écran « isApp » du prototype
 * (docs/Design de marketplace locale/Makinum.dc.html) : logo, recherche,
 * section nav selon le rôle, pastille position, carte utilisateur, déconnexion.
 * « Tableau de bord » (/dashboard) en tête de nav pour tous les rôles,
 * devant la section spécifique au rôle.
 * ACHETEUR : « Produits proches » (actif), « Vendeurs » (/vendeurs, T39),
 * « Ma demande » (/demandes, T16) — badge = nombre de brouillons EN_COURS
 * (DemandesProvider), masqué à 0 — et « Devenir vendeur » (/devenir-vendeur,
 * T48b, chemin libre-service).
 * VENDEUR : « Mon catalogue » (/vendeur/catalogue, T17a), « Demandes
 * reçues » (/vendeur/demandes, T17b) — badge = nombre de demandes ENVOYEE
 * en attente de clôture (DemandesRecuesProvider), masqué à 0 — et
 * « Paramètres » (/vendeur/parametres, T52b, dernier de la section).
 * ADMIN : « File de modération » (/admin/moderation), « Utilisateurs »
 * (/admin/vendeurs) et « Catégories » (/admin/categories, T31b).
 * La cloche de notifications (NotificationBell, /notifications) est dans la
 * rangée d'en-tête, visible aussi bien repliée (barre mobile) que dépliée
 * (sidebar desktop).
 *
 * `user === null` (T51, visiteur non connecté sur /produits ou /vendeurs) :
 * jeu minimal — recherche produits, « Produits proches » et « Vendeurs »
 * seulement (pas de « Tableau de bord », qui n'existe pas sans compte). Pas
 * de cloche de notifications (AppShell ne monte pas NotificationsProvider en
 * mode visiteur, cf. AppShell.tsx). À la place du bloc profil/déconnexion :
 * deux CTA, « Se connecter » et « Créer un compte », qui reportent le chemin
 * courant en `?returnTo=` pour ramener le visiteur ici une fois connecté
 * (src/lib/auth/return-to.ts). Le rendu visiteur (`VisitorNav`,
 * `VisitorFooter`) n'appelle ni `useDemandes()` ni `useDemandesRecues()` :
 * ces hooks supposent `DemandesProvider`/`DemandesRecuesProvider` montés,
 * absents du mode visiteur (AppShell) — les isoler dans `AuthenticatedNav`,
 * un composant distinct monté uniquement quand `user` est non nul, respecte
 * les Rules of Hooks sans les rendre conditionnels dans une même instance.
 */

const ROLE_LABELS: Record<PublicUser["role"], string> = {
  ACHETEUR: "Acheteur",
  VENDEUR: "Vendeur",
  ADMIN: "Admin",
};

/** En tête de nav, pour tous les rôles (T27a). */
const DASHBOARD_LINK = { href: "/dashboard", label: "Tableau de bord" } as const;

const ACHETEUR_LINKS = [
  { href: "/produits", label: "Produits proches" },
  { href: "/vendeurs", label: "Vendeurs" },
  { href: "/demandes", label: "Ma demande" },
  { href: "/devenir-vendeur", label: "Devenir vendeur" },
] as const;

const VENDEUR_LINKS = [
  { href: "/vendeur/catalogue", label: "Mon catalogue" },
  { href: "/vendeur/demandes", label: "Demandes reçues" },
  { href: "/vendeur/parametres", label: "Paramètres" },
] as const;

const ADMIN_LINKS = [
  { href: "/admin/moderation", label: "File de modération" },
  { href: "/admin/vendeurs", label: "Utilisateurs" },
  { href: "/admin/categories", label: "Catégories" },
] as const;

/** Jeu minimal pour un visiteur non connecté (T51) — catalogue public seul. */
const VISITOR_LINKS = [
  { href: "/produits", label: "Produits proches" },
  { href: "/vendeurs", label: "Vendeurs" },
] as const;

interface SidebarProps {
  user: PublicUser | null;
  /** Absent en mode visiteur (pas de bouton « Se déconnecter »). */
  onLogout?: () => void;
}

interface NavLinkItemProps {
  href: string;
  label: string;
  /** 0/undefined masque le badge — même règle que l'ancien inline `count > 0`. */
  badgeCount?: number;
  onNavigate: () => void;
}

function NavLinkItem({ href, label, badgeCount, onNavigate }: NavLinkItemProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-[11px] py-[11px] pl-[14px] pr-3 text-[14.5px] transition-colors",
        active
          ? "bg-cream/8 font-semibold text-cream"
          : "text-cream/72 hover:bg-cream/8 hover:text-cream",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-3 left-0 top-3 w-[3px] rounded-full",
          active ? "bg-accent" : "bg-transparent",
        )}
      />
      <span className="flex-1">{label}</span>
      {badgeCount ? (
        <span className="rounded-full bg-accent px-[8px] py-[2px] text-[11px] font-semibold text-brand">
          {badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function AuthenticatedNav({ user, onNavigate }: { user: PublicUser; onNavigate: () => void }) {
  const { draftCount } = useDemandes();
  const { pendingCount } = useDemandesRecues();
  const isVendeur = user.role === "VENDEUR";
  const isAdmin = user.role === "ADMIN";
  const roleLinks = isVendeur ? VENDEUR_LINKS : isAdmin ? ADMIN_LINKS : ACHETEUR_LINKS;
  const navLinks = [DASHBOARD_LINK, ...roleLinks];

  return (
    <>
      <div className="mb-[10px] px-[10px] text-[11px] uppercase tracking-[0.14em] text-cream/38">
        {ROLE_LABELS[user.role]}
      </div>
      <nav
        className="flex flex-col gap-1"
        aria-label={isVendeur ? "Navigation vendeur" : isAdmin ? "Navigation admin" : "Navigation acheteur"}
      >
        {navLinks.map((link) => (
          <NavLinkItem
            key={link.href}
            href={link.href}
            label={link.label}
            onNavigate={onNavigate}
            badgeCount={
              link.href === "/demandes"
                ? draftCount
                : link.href === "/vendeur/demandes"
                  ? pendingCount
                  : undefined
            }
          />
        ))}
      </nav>
    </>
  );
}

function VisitorNav({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Navigation visiteur">
      {VISITOR_LINKS.map((link) => (
        <NavLinkItem key={link.href} href={link.href} label={link.label} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function AuthenticatedFooter({ user, onLogout }: { user: PublicUser; onLogout?: () => void }) {
  const { status: geoStatus } = useGeo();

  return (
    <>
      {geoStatus === "granted" ? (
        <div className="flex items-center gap-2 rounded-[10px] border border-tint-brand-border bg-tint-brand px-3 py-[9px] text-[13px] text-brand-vivid">
          <span className="h-[7px] w-[7px] rounded-full bg-brand-vivid" aria-hidden="true" />
          Position activée
        </div>
      ) : null}

      <div className="flex items-center gap-[11px] border-t border-cream/14 pt-[14px]">
        <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-accent text-[12.5px] font-semibold text-brand">
          {initialsFromName(user.nom)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-cream">{user.nom}</div>
          <div className="truncate text-[12px] text-cream/50">{user.telephone ?? user.email}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="rounded-[9px] px-[10px] py-2 text-left text-[13.5px] text-cream/62 transition-colors hover:bg-cream/8 hover:text-cream"
      >
        Se déconnecter
      </button>
    </>
  );
}

function VisitorFooter({ returnTo }: { returnTo: string }) {
  return (
    <div className="flex flex-col gap-2 border-t border-cream/14 pt-[14px]">
      <Link
        href={buildLoginHref(returnTo)}
        className="rounded-[11px] bg-accent px-4 py-[11px] text-center text-[14px] font-semibold text-brand transition-colors hover:opacity-90"
      >
        Se connecter
      </Link>
      <Link
        href={buildInscriptionHref(returnTo)}
        className="rounded-[11px] border border-cream/24 px-4 py-[11px] text-center text-[14px] text-cream transition-colors hover:bg-cream/8"
      >
        Créer un compte
      </Link>
    </div>
  );
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMobileNav() {
    setMobileOpen(false);
  }

  return (
    <div className="shrink-0 bg-brand text-cream md:sticky md:top-0 md:flex md:h-screen md:w-[252px] md:flex-col md:self-start md:px-4 md:py-[22px]">
      <div className="flex items-center justify-between px-4 py-3 md:px-2 md:pb-[22px] md:pt-0">
        <Link href="/produits" className="flex items-center gap-[11px] text-cream">
          <Logo variant="negatif" decorative className="h-[30px] w-auto" />
          <span className="font-display text-[19px] font-bold tracking-tight">Makinum</span>
        </Link>
        <div className="flex items-center gap-1">
          {user ? <NotificationBell /> : null}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-cream/30 text-cream md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="app-mobile-nav"
            onClick={() => setMobileOpen((value) => !value)}
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
              {mobileOpen ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="app-mobile-nav"
        className={cn("flex-col gap-1 px-4 pb-2 md:flex md:px-2 md:pb-0", mobileOpen ? "flex" : "hidden")}
      >
        <SearchField />

        {user ? (
          <AuthenticatedNav user={user} onNavigate={closeMobileNav} />
        ) : (
          <VisitorNav onNavigate={closeMobileNav} />
        )}
      </div>

      <div
        className={cn(
          "flex-col gap-3 px-4 pb-4 pt-4 md:mt-auto md:flex md:px-2 md:pb-1",
          mobileOpen ? "flex" : "hidden",
        )}
      >
        {user ? (
          <AuthenticatedFooter user={user} onLogout={onLogout} />
        ) : (
          <VisitorFooter returnTo={pathname ?? "/produits"} />
        )}
      </div>
    </div>
  );
}
