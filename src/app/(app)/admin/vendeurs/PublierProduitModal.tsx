"use client";

import { useEffect, useId, useState } from "react";

import { Alert } from "@/components/ui";
import { ProductForm, type ProductFormPayload } from "@/components/products/ProductForm";
import {
  createProductForVendor,
  describeAdminCreateProductError,
  type AdminUserView,
} from "@/lib/admin";
import { listCategories } from "@/lib/categories/api";
import type { CategoryListItem } from "@/lib/categories/types";
import type { ProductView } from "@/lib/products/types";

interface PublierProduitModalProps {
  /** Vendeur ciblé, ou `null` : la modale ne se rend pas. */
  vendeur: AdminUserView | null;
  onClose: () => void;
  /** Appelé après une création réussie — le parent rafraîchit la liste. */
  onCreated: () => void;
}

/**
 * Modale « Publier un produit » (T52b) — action admin sur une ligne VENDEUR
 * validée et ayant autorisé la publication en son nom (voir le bouton dans
 * VendeursView, visible seulement sous ces deux conditions). Réutilise
 * `ProductForm` (même composant que /vendeur/produits/nouveau, T32) plutôt
 * que de dupliquer les champs/validations : le formulaire porte déjà son
 * propre bouton de soumission, incompatible avec le pied fixe
 * confirmer/annuler de `ConfirmDialog` — cette modale est donc construite à
 * la main (même a11y de base : `role="dialog"`, `aria-modal`, fermeture par
 * Échap ou clic sur l'arrière-plan), sans le piège de focus complet de
 * ConfirmDialog (pas d'action destructrice à protéger ici).
 *
 * Choix du contenant (page dédiée vs modale) : une page dédiée
 * (`/admin/vendeurs/[id]/produits/nouveau`) devrait re-résoudre le vendeur
 * ciblé au chargement — `GET /admin/utilisateurs` n'a pas d'équivalent par
 * id (seuls list/PATCH/DELETE existent, backend/src/reports/
 * admin-users.controller.ts) — alors que la ligne qui déclenche l'action a
 * déjà l'`AdminUserView` complet (id + nom) sous la main. Une modale évite
 * ce refetch et reste cohérente avec les autres actions de cette page
 * (« Passer vendeur » ouvre déjà une modale contenant un champ de
 * formulaire). Les endpoints photo (T52a) ne sont pas utilisés ici : sans
 * page d'édition admin dédiée, la création s'arrête à la fiche produit —
 * hors périmètre de cette tâche.
 */
export function PublierProduitModal({ vendeur, onClose, onCreated }: PublierProduitModalProps) {
  const titleId = useId();

  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<ProductView | null>(null);

  const open = vendeur !== null;

  useEffect(() => {
    if (!open) return;
    // Repart d'une erreur propre à chaque ouverture (le composant reste monté
    // entre deux ouvertures — voir l'effet suivant, qui réarme submitting/
    // error/createdProduct de la même façon).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- réinitialisation déclenchée par la transition `open`, pas une synchronisation de rendu.
    setCategoriesError(null);
    let cancelled = false;
    listCategories()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch(() => {
        if (!cancelled) setCategoriesError("Impossible de charger les catégories. Réessaie.");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Repart d'un état propre à chaque ouverture, sur un vendeur potentiellement différent.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- réinitialisation déclenchée par la transition `open`, pas une synchronisation de rendu.
    setSubmitting(false);
    setError(null);
    setCreatedProduct(null);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose change à chaque rendu du parent (fermeture non mémoïsée) ; seul `open` doit ré-armer l'écouteur.
  }, [open]);

  if (!vendeur) return null;
  // Alias `const` : narrowe `vendeur` (non-null) pour les fermetures définies
  // ci-dessous (handleSubmit), que le contrôle de flux de TypeScript ne
  // propage pas au travers d'une déclaration de fonction imbriquée.
  const targetVendeur = vendeur;

  async function handleSubmit(payload: ProductFormPayload) {
    setSubmitting(true);
    setError(null);
    try {
      const product = await createProductForVendor(targetVendeur.id, payload);
      setCreatedProduct(product);
      onCreated();
    } catch (err) {
      setError(describeAdminCreateProductError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/50 px-4 py-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[560px] rounded-xl border border-border bg-white p-6 shadow-soft-lg"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-[19px] font-bold text-ink">
            Publier un produit pour {vendeur.nom}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 text-[13px] text-brand-subtle hover:text-brand"
          >
            Fermer
          </button>
        </div>
        <p className="mb-5 text-[13.5px] text-brand-subtle">
          Ce produit sera publié directement dans le catalogue de {vendeur.nom}.
        </p>

        {error ? (
          <Alert variant="danger" className="mb-5">
            {error}
          </Alert>
        ) : null}
        {categoriesError ? (
          <Alert variant="danger" className="mb-5">
            {categoriesError}
          </Alert>
        ) : null}

        {createdProduct ? (
          <Alert variant="success" className="mb-5">
            Produit publié dans le catalogue de {vendeur.nom} : « {createdProduct.titre} ».
          </Alert>
        ) : (
          <ProductForm
            categories={categories}
            submitLabel="Publier le produit"
            submittingLabel="Publication…"
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
