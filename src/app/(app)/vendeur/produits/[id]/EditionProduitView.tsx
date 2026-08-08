"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";

import { Alert } from "@/components/ui";
import { ProductForm, type ProductFormPayload } from "@/components/products/ProductForm";
import { ApiError } from "@/lib/api";
import { listCategories } from "@/lib/categories/api";
import type { CategoryListItem } from "@/lib/categories/types";
import { getProduct } from "@/lib/products/api";
import { resizeImageFile } from "@/lib/products/resize-image";
import type { ProductView } from "@/lib/products/types";
import {
  addProductPhoto,
  deleteProductPhoto,
  MAX_PHOTOS_PAR_PRODUIT,
  reorderProductPhotos,
  updateProduct,
} from "@/lib/products/vendor-api";

interface PendingUpload {
  key: string;
  /** Fichier d'origine (avant redimensionnement) — nécessaire pour « Réessayer ». */
  file: File;
  previewUrl: string;
  status: "uploading" | "error";
  error?: string;
}

function describeUpdateError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "CATEGORY_NOT_FOUND":
        return "Catégorie introuvable — choisis-en une autre.";
      case "PRODUCT_NOT_FOUND":
        return "Ce produit n'existe plus.";
      case "NOT_PRODUCT_OWNER":
        return "Ce produit appartient à un autre vendeur.";
      case "VENDOR_NOT_VALIDATED":
        return "Ton compte vendeur doit être validé par un administrateur avant de modifier ce produit.";
      default:
        return error.message || "Impossible d'enregistrer les modifications. Réessaie.";
    }
  }
  return "Impossible d'enregistrer les modifications. Réessaie.";
}

function describePhotoError(error: unknown): string {
  if (error instanceof ApiError) {
    // apiFetch (src/lib/api.ts) lève ce code quand `fetch` lui-même a rejeté
    // — la requête n'a jamais atteint de réponse HTTP (connexion coupée en
    // cours d'envoi, réseau absent…). Un code générique serait trompeur ici :
    // ce n'est pas le serveur qui a refusé la photo.
    if (error.code === "NETWORK_ERROR") {
      return "Envoi interrompu — vérifie ta connexion, ou réessaie avec une photo plus légère.";
    }
    if (error.code === "VENDOR_NOT_VALIDATED") {
      return "Ton compte vendeur doit être validé par un administrateur avant d'ajouter des photos.";
    }
    return error.message || "Envoi impossible. Réessaie.";
  }
  return "Envoi impossible. Réessaie.";
}

interface EditionProduitViewProps {
  productId: string;
}

/**
 * « Modifier mon produit » (/vendeur/produits/[id]) : formulaire
 * titre/description/prix/catégorie/position (mêmes champs que la création,
 * ProductForm partagé) + gestion des photos (grille, upload multiple
 * séquentiel, suppression, réordonnancement ← →). Client component (pas de
 * fetch côté Server Component) : le jeton de session vit en mémoire du
 * document (T28), inaccessible pendant le rendu serveur — voir
 * src/lib/auth/session.ts.
 */
export function EditionProduitView({ productId }: EditionProduitViewProps) {
  const [product, setProduct] = useState<ProductView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryListItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [photoActionError, setPhotoActionError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const [fetchedProduct, categoryList] = await Promise.all([
        getProduct(productId),
        listCategories(),
      ]);
      setProduct(fetchedProduct);
      setCategories(categoryList);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setLoadError(err instanceof ApiError ? err.message : "Impossible de charger ce produit.");
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  async function handleUpdate(payload: ProductFormPayload) {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      const updated = await updateProduct(productId, payload);
      setProduct(updated);
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(describeUpdateError(err));
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Redimensionne (T40 — optimisation de transport, repli silencieux sur le
   * fichier d'origine en cas d'échec, voir resize-image.ts) puis envoie un
   * fichier ; partagé entre l'envoi initial et « Réessayer ».
   */
  async function uploadPendingFile(key: string, file: File) {
    try {
      const fileToSend = await resizeImageFile(file);
      const photo = await addProductPhoto(productId, fileToSend);
      setProduct((prev) => (prev ? { ...prev, photos: [...prev.photos, photo] } : prev));
      setPendingUploads((prev) => {
        const found = prev.find((upload) => upload.key === key);
        if (found) URL.revokeObjectURL(found.previewUrl);
        return prev.filter((upload) => upload.key !== key);
      });
    } catch (err) {
      setPendingUploads((prev) =>
        prev.map((upload) =>
          upload.key === key
            ? { ...upload, status: "error", error: describePhotoError(err) }
            : upload,
        ),
      );
    }
  }

  /** Envoi séquentiel : un fichier à la fois, indicateur (et erreur) propre à chacun. */
  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    // `event.target.files` est une FileList VIVANTE : remettre `value` à "" la
    // vide aussi (même objet) — il faut donc la copier AVANT, jamais après.
    const fichiers = Array.from(event.target.files ?? []);
    event.target.value = ""; // permet de resélectionner le(s) même(s) fichier(s)
    if (fichiers.length === 0) return;

    for (const file of fichiers) {
      const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      const previewUrl = URL.createObjectURL(file);
      setPendingUploads((prev) => [...prev, { key, file, previewUrl, status: "uploading" }]);
      await uploadPendingFile(key, file);
    }
  }

  /** Relance l'envoi (redimensionnement compris) du fichier d'une tuile en erreur. */
  function retryPendingUpload(key: string) {
    const upload = pendingUploads.find((item) => item.key === key);
    if (!upload) return;
    setPendingUploads((prev) =>
      prev.map((item) => (item.key === key ? { ...item, status: "uploading", error: undefined } : item)),
    );
    void uploadPendingFile(key, upload.file);
  }

  function dismissPendingUpload(key: string) {
    setPendingUploads((prev) => {
      const found = prev.find((upload) => upload.key === key);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((upload) => upload.key !== key);
    });
  }

  async function handleDeletePhoto(photoId: string) {
    setDeletingId(photoId);
    setPhotoActionError(null);
    try {
      await deleteProductPhoto(productId, photoId);
      setProduct((prev) =>
        prev ? { ...prev, photos: prev.photos.filter((photo) => photo.id !== photoId) } : prev,
      );
    } catch (err) {
      setPhotoActionError(err instanceof ApiError ? err.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMovePhoto(photoId: string, direction: -1 | 1) {
    if (!product) return;
    const sorted = [...product.photos].sort((a, b) => a.ordre - b.ordre);
    const index = sorted.findIndex((photo) => photo.id === photoId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= sorted.length) return;

    const reordered = [...sorted];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const photoIds = reordered.map((photo) => photo.id);

    setReorderingId(photoId);
    setPhotoActionError(null);
    try {
      const updatedPhotos = await reorderProductPhotos(productId, photoIds);
      setProduct((prev) => (prev ? { ...prev, photos: updatedPhotos } : prev));
    } catch (err) {
      setPhotoActionError(err instanceof ApiError ? err.message : "Réordonnancement impossible.");
    } finally {
      setReorderingId(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[760px] px-6 pb-[60px] pt-[28px] sm:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/2 rounded bg-beige-soft" />
          <div className="h-40 rounded bg-beige-soft" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-[760px] px-6 pb-[60px] pt-[28px] sm:px-8">
        <p className="mb-4 text-[14.5px] text-brand-subtle">Ce produit est introuvable.</p>
        <Link href="/vendeur/catalogue" className="text-brand underline hover:text-accent-strong">
          ← Retour à mon catalogue
        </Link>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="mx-auto max-w-[760px] px-6 pb-[60px] pt-[28px] sm:px-8">
        <Alert variant="danger">{loadError ?? "Impossible de charger ce produit."}</Alert>
      </div>
    );
  }

  const sortedPhotos = [...product.photos].sort((a, b) => a.ordre - b.ordre);
  const uploadDisabled = product.photos.length >= MAX_PHOTOS_PAR_PRODUIT;

  return (
    <div className="mx-auto max-w-[760px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <Link
        href="/vendeur/catalogue"
        className="mb-5 inline-block text-[13.5px] text-brand-subtle hover:text-brand"
      >
        ← Mon catalogue
      </Link>
      <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
        Modifier mon produit
      </h1>
      <p className="mb-6 text-[14.5px] text-brand-subtle">{product.titre}</p>

      {submitSuccess ? (
        <Alert variant="success" className="mb-5">
          Modifications enregistrées.
        </Alert>
      ) : null}
      {submitError ? (
        <Alert variant="danger" className="mb-5">
          {submitError}
        </Alert>
      ) : null}

      <ProductForm
        categories={categories}
        initialValues={{
          titre: product.titre,
          description: product.description,
          prix: String(Math.round(Number(product.prix))),
          categorieId: product.categorieId,
          latitude: product.latitude,
          longitude: product.longitude,
        }}
        submitLabel="Enregistrer les modifications"
        submittingLabel="Enregistrement…"
        submitting={submitting}
        onSubmit={handleUpdate}
      />

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[19px] font-bold text-ink">Photos</h2>
          <span className="text-[13px] text-brand-subtle">
            {product.photos.length} / {MAX_PHOTOS_PAR_PRODUIT}
          </span>
        </div>

        {photoActionError ? (
          <Alert variant="danger" className="mb-4">
            {photoActionError}
          </Alert>
        ) : null}

        {sortedPhotos.length === 0 && pendingUploads.length === 0 ? (
          <p className="mb-4 text-[13.5px] text-brand-faint">
            Aucune photo pour l&apos;instant — ajoute au moins une image pour rendre ce produit plus
            visible.
          </p>
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {sortedPhotos.map((photo, index) => (
              <div key={photo.id} className="relative overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- vignette backend, pas de config next/image en V1. */}
                <img src={photo.urlMiniature} alt="" className="aspect-square w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink/70 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => handleMovePhoto(photo.id, -1)}
                    disabled={index === 0 || reorderingId !== null}
                    aria-label={`Déplacer la photo ${index + 1} vers la gauche`}
                    className="text-[13px] text-cream disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    disabled={deletingId === photo.id}
                    aria-label={`Supprimer la photo ${index + 1}`}
                    className="text-[11px] text-cream disabled:opacity-40"
                  >
                    {deletingId === photo.id ? "…" : "Supprimer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMovePhoto(photo.id, 1)}
                    disabled={index === sortedPhotos.length - 1 || reorderingId !== null}
                    aria-label={`Déplacer la photo ${index + 1} vers la droite`}
                    className="text-[13px] text-cream disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
            {pendingUploads.map((upload) => (
              <div key={upload.key} className="relative overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- prévisualisation locale avant envoi. */}
                <img
                  src={upload.previewUrl}
                  alt=""
                  className="aspect-square w-full object-cover opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-ink/40 text-[12px] text-cream">
                  {upload.status === "uploading" ? "Envoi…" : "Erreur"}
                </div>
                {upload.status === "error" ? (
                  <div className="absolute inset-x-0 bottom-0 bg-danger px-2 py-1 text-[11px] text-white">
                    {upload.error}{" "}
                    <button
                      type="button"
                      onClick={() => retryPendingUpload(upload.key)}
                      className="underline"
                    >
                      Réessayer
                    </button>{" "}
                    <button
                      type="button"
                      onClick={() => dismissPendingUpload(upload.key)}
                      className="underline"
                    >
                      Retirer
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <label
          className={
            "inline-flex items-center gap-2 rounded-md border border-border-strong bg-white px-4 py-2.5 text-[13.5px] text-ink transition-colors " +
            (uploadDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-brand")
          }
        >
          Ajouter des photos
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFilesSelected}
            disabled={uploadDisabled}
            className="sr-only"
          />
        </label>
        {uploadDisabled ? (
          <p className="mt-2 text-[12.5px] text-brand-faint">
            Limite de {MAX_PHOTOS_PAR_PRODUIT} photos atteinte — supprime une photo pour en ajouter une
            nouvelle.
          </p>
        ) : null}
      </section>
    </div>
  );
}
