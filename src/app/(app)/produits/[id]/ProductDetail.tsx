"use client";

import { useState } from "react";
import Link from "next/link";

import { PhotoPlaceholder } from "@/components/products/PhotoPlaceholder";
import { VendeurBadge } from "@/components/products/VendeurBadge";
import { formatPrixGNF, initialsFromName } from "@/lib/format";
import { haversineDistanceKm, roundDistanceKm, useGeo } from "@/lib/geo";
import type { ProductView } from "@/lib/products/types";

/**
 * Fiche produit (/produits/[id]) — écran isProduct du prototype : galerie,
 * description, carte vendeur, actions (« Ajouter à ma demande » — désactivé,
 * T16 le branchera — et Appeler/WhatsApp, conditionnels à un futur champ
 * `vendeur.telephone` que l'API n'expose pas encore).
 */
export function ProductDetail({ product }: { product: ProductView }) {
  const { position } = useGeo();
  const photos = [...product.photos].sort((a, b) => a.ordre - b.ordre);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedPhoto = photos[selectedIndex] ?? null;

  const distanceKm =
    position && product.latitude !== null && product.longitude !== null
      ? roundDistanceKm(
          haversineDistanceKm(position, { lat: product.latitude, lng: product.longitude }),
        )
      : null;

  const telephone = product.vendeur.telephone;
  const whatsappNumber = telephone ? telephone.replace(/\D/g, "") : null;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-[60px] pt-[26px] sm:px-8 lg:px-10">
      <Link href="/produits" className="mb-5 inline-block text-[13.5px] text-brand-subtle hover:text-brand">
        ← Retour aux produits proches
      </Link>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="mb-3 h-[420px] overflow-hidden rounded-[18px]">
            {selectedPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- photos backend, pas de config next/image en V1.
              <img
                src={selectedPhoto.url}
                alt={product.titre}
                className="h-full w-full object-cover"
              />
            ) : (
              <PhotoPlaceholder />
            )}
          </div>

          {photos.length > 1 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(58px,1fr))] gap-2">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  aria-label={`Photo ${index + 1}`}
                  aria-current={index === selectedIndex}
                  className={
                    "aspect-square overflow-hidden rounded-[9px] border-2 " +
                    (index === selectedIndex ? "border-brand" : "border-transparent")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- vignette backend, pas de config next/image en V1. */}
                  <img src={photo.urlMiniature} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-[30px]">
            <h2 className="mb-2.5 font-display text-[19px] font-bold">Description</h2>
            <p className="max-w-[620px] whitespace-pre-line text-[15px] leading-[1.65] text-brand-muted">
              {product.description}
            </p>
          </div>
        </div>

        <div>
          <div className="lg:sticky lg:top-[24px]">
            <div className="rounded-[18px] border border-border bg-white p-[26px]">
              <span className="mb-3.5 inline-block rounded-full bg-beige-soft px-[11px] py-[5px] text-[12.5px] text-brand-subtle">
                {product.categorie.nom}
              </span>
              <h1 className="mb-3 font-display text-[26px] font-bold leading-[1.12] tracking-tight text-ink sm:text-[30px]">
                {product.titre}
              </h1>
              <div className="mb-1.5 font-display text-[28px] font-bold text-brand sm:text-[32px]">
                {formatPrixGNF(product.prix)}
              </div>
              <div className="mb-[22px] text-[13.5px] text-brand-subtle">
                Paiement à la livraison, hors application
              </div>

              <div className="mb-5 flex items-center gap-3 border-t border-beige pt-[18px]">
                <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-brand text-[14px] font-semibold text-accent">
                  {initialsFromName(product.vendeur.nom)}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[15px] font-medium text-ink">
                    {product.vendeur.nom}
                    <VendeurBadge statut={product.vendeur.statutVendeur} />
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-brand-faint">
                    {product.vendeur.noteMoyenne != null ? (
                      <span>
                        ★ {product.vendeur.noteMoyenne}
                        {product.vendeur.nbAvis != null ? ` (${product.vendeur.nbAvis})` : ""}
                      </span>
                    ) : null}
                    {distanceKm !== null ? <span>à {distanceKm} km de toi</span> : null}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="mb-2.5 w-full cursor-not-allowed rounded-xl bg-brand px-5 py-4 text-[15.5px] font-semibold text-cream opacity-60"
              >
                Ajouter à ma demande
              </button>

              {telephone ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={`tel:${telephone}`}
                    className="rounded-[11px] border border-border-strong bg-white px-4 py-[13px] text-center text-[14px] text-ink transition-colors hover:border-brand"
                  >
                    Appeler
                  </a>
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-[11px] border border-border-strong bg-white px-4 py-[13px] text-center text-[14px] text-ink transition-colors hover:border-brand"
                  >
                    WhatsApp
                  </a>
                </div>
              ) : null}

              <p className="mt-4 text-[12.5px] leading-[1.55] text-brand-faint">
                Ajouter n&apos;engage aucun paiement : le vendeur reçoit une notification et vous
                convenez ensemble du reste.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
