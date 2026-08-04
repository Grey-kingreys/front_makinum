"use client";

import { useState } from "react";
import Link from "next/link";

import { Alert } from "@/components/ui";
import { PhotoPlaceholder } from "@/components/products/PhotoPlaceholder";
import { VendeurBadge } from "@/components/products/VendeurBadge";
import { VendorReviewsSection } from "@/components/reviews/VendorReviewsSection";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrixGNF, initialsFromName } from "@/lib/format";
import { haversineDistanceKm, roundDistanceKm, useGeo } from "@/lib/geo";
import {
  createOrCompletePurchaseRequest,
  describeDemandeError,
  useDemandes,
} from "@/lib/purchase-requests";
import type { ProductView } from "@/lib/products/types";

const ADD_BUTTON_CLASSES =
  "mb-2.5 block w-full cursor-pointer rounded-xl bg-brand px-5 py-4 text-center text-[15.5px] font-semibold text-cream transition-colors hover:bg-brand-vivid disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Fiche produit (/produits/[id]) — écran isProduct du prototype : galerie,
 * description, carte vendeur, actions. « Ajouter à ma demande » (T16) :
 * sélecteur de quantité (1 par défaut) puis POST /demandes — le backend
 * fusionne silencieusement dans le brouillon existant du vendeur s'il y en a
 * déjà un pour ce couple acheteur↔vendeur. Non connecté : le bouton renvoie
 * vers /connexion plutôt que de tenter l'appel API.
 */
export function ProductDetail({ product }: { product: ProductView }) {
  const { position } = useGeo();
  const { user } = useAuth();
  const { refresh: refreshDemandes } = useDemandes();
  const photos = [...product.photos].sort((a, b) => a.ordre - b.ordre);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedPhoto = photos[selectedIndex] ?? null;

  const [quantite, setQuantite] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addedDemandeId, setAddedDemandeId] = useState<string | null>(null);

  const distanceKm =
    position && product.latitude !== null && product.longitude !== null
      ? roundDistanceKm(
          haversineDistanceKm(position, { lat: product.latitude, lng: product.longitude }),
        )
      : null;

  const telephone = product.vendeur.telephone;
  const whatsappNumber = telephone ? telephone.replace(/\D/g, "") : null;

  async function handleAdd() {
    setAdding(true);
    setAddError(null);
    try {
      const demande = await createOrCompletePurchaseRequest({ produitId: product.id, quantite });
      setAddedDemandeId(demande.id);
      await refreshDemandes();
    } catch (err) {
      setAddError(
        describeDemandeError(err, err instanceof ApiError ? err.message : "Ajout impossible. Réessaie."),
      );
    } finally {
      setAdding(false);
    }
  }

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

          <VendorReviewsSection vendeurId={product.vendeurId} />
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

              {addedDemandeId ? (
                <div className="mb-2.5 rounded-xl border border-tint-brand-border bg-tint-brand px-4 py-3.5">
                  <p className="mb-1.5 text-[13.5px] font-medium text-brand-vivid">
                    Ajouté à ta demande.
                  </p>
                  <Link
                    href={`/demandes/${addedDemandeId}`}
                    className="text-[13.5px] font-medium text-brand-vivid underline"
                  >
                    Voir ma demande
                  </Link>
                </div>
              ) : (
                <>
                  {user ? (
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[13.5px] text-ink">Quantité</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuantite((value) => Math.max(1, value - 1))}
                          disabled={quantite <= 1}
                          aria-label="Diminuer la quantité"
                          className="grid h-8 w-8 place-items-center rounded-full border border-border-strong text-[15px] text-ink transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-[15px] font-medium" aria-live="polite">
                          {quantite}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantite((value) => value + 1)}
                          aria-label="Augmenter la quantité"
                          className="grid h-8 w-8 place-items-center rounded-full border border-border-strong text-[15px] text-ink transition-colors hover:border-brand"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {addError ? (
                    <Alert variant="danger" className="mb-2.5">
                      {addError}
                    </Alert>
                  ) : null}

                  {user ? (
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={adding}
                      aria-busy={adding}
                      className={ADD_BUTTON_CLASSES}
                    >
                      {adding ? "Ajout…" : "Ajouter à ma demande"}
                    </button>
                  ) : (
                    <Link href="/connexion" className={ADD_BUTTON_CLASSES}>
                      Ajouter à ma demande
                    </Link>
                  )}
                </>
              )}

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
