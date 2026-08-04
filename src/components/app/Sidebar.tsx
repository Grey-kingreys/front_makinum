"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { useGeo } from "@/lib/geo";
import { initialsFromName } from "@/lib/format";
import { useDemandes } from "@/lib/purchase-requests";
import type { PublicUser } from "@/lib/auth/types";

import { SearchField } from "./SearchField";

/**
 * Sidebar applicative — reproduit l'écran « isApp » du prototype
 * (docs/Design de marketplace locale/Makinum.dc.html) : logo, recherche,
 * section nav selon le rôle, pastille position, carte utilisateur, déconnexion.
 * ACHETEUR : « Produits proches » (actif) et « Ma demande » (/demandes, T16)
 * — badge = nombre de brouillons EN_COURS (DemandesProvider), masqué à 0.
 * VENDEUR (T17a) : « Mon catalogue » (/vendeur/catalogue) et « Demandes
 * reçues » — lien inerte marqué « bientôt » tant que T17b (qui dépend de
 * l'API T9) n'est pas livrée.
 */

const ROLE_LABELS: Record<PublicUser["role"], string> = {
  ACHETEUR: "Acheteur",
  VENDEUR: "Vendeur",
  ADMIN: "Admin",
};

const ACHETEUR_LINKS = [
  { href: "/produits", label: "Produits proches" },
  { href: "/demandes", label: "Ma demande" },
] as const;

const VENDEUR_LINKS = [{ href: "/vendeur/catalogue", label: "Mon catalogue" }] as const;

interface SidebarProps {
  user: PublicUser;
  onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const { status: geoStatus } = useGeo();
  const { draftCount } = useDemandes();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isVendeur = user.role === "VENDEUR";
  const navLinks = isVendeur ? VENDEUR_LINKS : ACHETEUR_LINKS;

  return (
    <div className="shrink-0 bg-brand text-cream md:sticky md:top-0 md:flex md:h-screen md:w-[252px] md:flex-col md:self-start md:px-4 md:py-[22px]">
      <div className="flex items-center justify-between px-4 py-3 md:px-2 md:pb-[22px] md:pt-0">
        <Link href="/produits" className="flex items-center gap-[11px] text-cream">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-accent font-display text-[17px] font-extrabold text-brand">
            M
          </span>
          <span className="font-display text-[19px] font-bold tracking-tight">Makinum</span>
        </Link>
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

      <div
        id="app-mobile-nav"
        className={cn("flex-col gap-1 px-4 pb-2 md:flex md:px-2 md:pb-0", mobileOpen ? "flex" : "hidden")}
      >
        <SearchField />

        <div className="mb-[10px] px-[10px] text-[11px] uppercase tracking-[0.14em] text-cream/38">
          {ROLE_LABELS[user.role]}
        </div>
        <nav
          className="flex flex-col gap-1"
          aria-label={isVendeur ? "Navigation vendeur" : "Navigation acheteur"}
        >
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
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
                <span className="flex-1">{link.label}</span>
                {link.href === "/demandes" && draftCount > 0 ? (
                  <span className="rounded-full bg-accent px-[8px] py-[2px] text-[11px] font-semibold text-brand">
                    {draftCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
          {isVendeur ? (
            <div
              aria-disabled="true"
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center gap-2.5 rounded-[11px] py-[11px] pl-[14px] pr-3 text-[14.5px] text-cream/40"
            >
              <span className="flex-1">Demandes reçues</span>
              <span className="rounded-full bg-cream/12 px-2 py-0.5 text-[11px] text-cream/60">
                bientôt
              </span>
            </div>
          ) : null}
        </nav>
      </div>

      <div
        className={cn(
          "flex-col gap-3 px-4 pb-4 pt-4 md:mt-auto md:flex md:px-2 md:pb-1",
          mobileOpen ? "flex" : "hidden",
        )}
      >
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
            <div className="truncate text-[12px] text-cream/50">{user.telephone}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-[9px] px-[10px] py-2 text-left text-[13.5px] text-cream/62 transition-colors hover:bg-cream/8 hover:text-cream"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
