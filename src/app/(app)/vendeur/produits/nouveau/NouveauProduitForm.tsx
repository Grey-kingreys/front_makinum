"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui";
import { ProductForm, type ProductFormPayload } from "@/components/products/ProductForm";
import { ApiError } from "@/lib/api";
import { listCategories } from "@/lib/categories/api";
import type { CategoryListItem } from "@/lib/categories/types";
import { createProduct } from "@/lib/products/vendor-api";

function describeCreateError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "PRODUCT_LIMIT_REACHED":
        return "Tu as atteint la limite de 30 produits actifs. Désactive un produit dans ton catalogue avant d'en publier un nouveau.";
      case "CATEGORY_NOT_FOUND":
        return "Catégorie introuvable — choisis-en une autre.";
      default:
        return error.message || "Impossible de publier ce produit. Réessaie.";
    }
  }
  return "Impossible de publier ce produit. Réessaie.";
}

/**
 * « Publier un produit » (/vendeur/produits/nouveau) : POST /products puis
 * redirection vers l'édition (/vendeur/produits/[id]) pour ajouter les
 * photos — le prototype ne détaille pas cet écran (seul le bouton « Publier
 * un produit » existe sur « Mon catalogue »), le formulaire reprend donc les
 * conventions des écrans auth (T14) : Card centrée, primitives Input/Button.
 */
export function NouveauProduitForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch(() => {
        if (!cancelled) setCategoriesError("Impossible de charger les catégories. Recharge la page.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(payload: ProductFormPayload) {
    setSubmitting(true);
    setError(null);
    setLimitReached(false);
    try {
      const product = await createProduct(payload);
      router.push(`/vendeur/produits/${product.id}`);
    } catch (err) {
      setError(describeCreateError(err));
      setLimitReached(err instanceof ApiError && err.code === "PRODUCT_LIMIT_REACHED");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[640px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <Link
        href="/vendeur/catalogue"
        className="mb-5 inline-block text-[13.5px] text-brand-subtle hover:text-brand"
      >
        ← Mon catalogue
      </Link>
      <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
        Publier un produit
      </h1>
      <p className="mb-6 text-[14.5px] text-brand-subtle">
        Les photos s&apos;ajoutent à l&apos;étape suivante.
      </p>

      {error ? (
        <Alert variant="danger" className="mb-5">
          {error}
          {limitReached ? (
            <>
              {" "}
              <Link href="/vendeur/catalogue" className="underline">
                Voir mon catalogue
              </Link>
            </>
          ) : null}
        </Alert>
      ) : null}
      {categoriesError ? (
        <Alert variant="danger" className="mb-5">
          {categoriesError}
        </Alert>
      ) : null}

      <ProductForm
        categories={categories}
        submitLabel="Publier le produit"
        submittingLabel="Publication…"
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
