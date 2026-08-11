"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ProductCard } from "@/components/products/ProductCard";
import { VendeurBadge } from "@/components/products/VendeurBadge";
import { VendorReviewsSection } from "@/components/reviews/VendorReviewsSection";
import { ContactButtons } from "@/components/ui";
import { buildLoginHref } from "@/lib/auth";
import { initialsFromName } from "@/lib/format";
import type { VendorDetail as VendorDetailData } from "@/lib/vendors/types";

/**
 * Fiche vendeur publique (/vendeurs/[id], T39) : identité (nom, badge, note
 * moyenne + nombre d'avis), grille de ses produits actifs (ProductCard,
 * réutilisé tel quel — src/components/products/ProductCard.tsx), ses avis
 * (VendorReviewsSection, réutilisé tel quel — déjà branché sur GET
 * /vendeurs/:id/avis, paginé), et bloc contact calqué sur celui de la fiche
 * produit (src/app/(app)/produits/[id]/ProductDetail.tsx) : boutons
 * appel/WhatsApp si `telephone` est renseigné (requête authentifiée côté
 * backend), sinon invitation à se connecter — jamais de numéro pour un
 * visiteur anonyme (règle de confidentialité du contrat GET /vendeurs/:id).
 * L'invitation pointe vers /connexion?returnTo=<chemin courant> (T51) : le
 * visiteur revient sur cette fiche une fois connecté.
 */
export function VendeurDetail({ vendor }: { vendor: VendorDetailData }) {
  const pathname = usePathname();
  const telephone = vendor.telephone;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-[60px] pt-[26px] sm:px-8 lg:px-10">
      <Link href="/vendeurs" className="mb-5 inline-block text-[13.5px] text-brand-subtle hover:text-brand">
        ← Retour aux vendeurs
      </Link>

      <div className="mb-8 flex flex-col gap-6 rounded-[18px] border border-border bg-white p-[26px] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-[14px]">
          <div className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full bg-brand text-[17px] font-semibold text-accent">
            {initialsFromName(vendor.nom)}
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="font-display text-[24px] font-bold tracking-tight text-ink sm:text-[27px]">
                {vendor.nom}
              </h1>
              <VendeurBadge statut={vendor.statutVendeur} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[13.5px] text-brand-faint">
              {vendor.noteMoyenne !== null ? (
                <span>
                  ★ {vendor.noteMoyenne} ({vendor.nbAvis} avis)
                </span>
              ) : (
                <span>Pas encore d&apos;avis</span>
              )}
              <span>
                {vendor.nbProduitsActifs} produit{vendor.nbProduitsActifs > 1 ? "s" : ""} actif
                {vendor.nbProduitsActifs > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="sm:w-[260px] sm:shrink-0">
          {telephone ? (
            <ContactButtons telephone={telephone} />
          ) : (
            <div className="rounded-[11px] border border-dashed border-border-strong bg-cream-alt px-4 py-3.5 text-center text-[13px] leading-relaxed text-brand-subtle">
              <Link href={buildLoginHref(pathname)} className="font-medium text-brand-vivid underline">
                Connecte-toi
              </Link>{" "}
              pour voir les coordonnées de ce vendeur.
            </div>
          )}
        </div>
      </div>

      <div className="mb-2">
        <h2 className="mb-4 font-display text-[19px] font-bold text-ink">Produits</h2>
        {vendor.produits.length === 0 ? (
          <p className="text-[14px] text-brand-subtle">
            Ce vendeur n&apos;a pas de produit actif pour l&apos;instant.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vendor.produits.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <VendorReviewsSection vendeurId={vendor.id} />
    </div>
  );
}
