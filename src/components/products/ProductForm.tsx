"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Alert, Button, Input } from "@/components/ui";
import type { CategoryListItem } from "@/lib/categories/types";
import { useGeo } from "@/lib/geo";

/**
 * Formulaire produit partagé entre création (/vendeur/produits/nouveau) et
 * édition (/vendeur/produits/[id]) — titre, description, prix, catégorie,
 * position optionnelle. Le prix est manipulé en francs guinéens entiers
 * (GNF n'a pas de subdivision courante) : la valeur affichée est formatée
 * avec séparateur de milliers, la valeur soumise est un nombre entier.
 */

export interface ProductFormPayload {
  titre: string;
  description: string;
  prix: number;
  categorieId: string;
  latitude?: number;
  longitude?: number;
}

export interface ProductFormInitialValues {
  titre?: string;
  description?: string;
  /** Chiffres seulement, sans séparateur — ex. "185000". */
  prix?: string;
  categorieId?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface ProductFormProps {
  categories: CategoryListItem[];
  initialValues?: ProductFormInitialValues;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  onSubmit: (payload: ProductFormPayload) => void | Promise<void>;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function formatDigits(digits: string): string {
  if (!digits) return "";
  return new Intl.NumberFormat("fr-FR").format(Number(digits));
}

export function ProductForm({
  categories,
  initialValues,
  submitLabel,
  submittingLabel,
  submitting,
  onSubmit,
}: ProductFormProps) {
  const { status: geoStatus, position, request } = useGeo();

  const [titre, setTitre] = useState(initialValues?.titre ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [prixDigits, setPrixDigits] = useState(initialValues?.prix ?? "");
  const [categorieId, setCategorieId] = useState(initialValues?.categorieId ?? "");
  const [latitude, setLatitude] = useState<number | null>(initialValues?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialValues?.longitude ?? null);
  const [wantsPosition, setWantsPosition] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // N'applique la position acquise que si l'utilisateur a explicitement
  // cliqué « Utiliser ma position » — sinon une géoloc déjà accordée sur
  // /produits plus tôt dans la session écraserait silencieusement une
  // position déjà saisie/chargée pour ce produit.
  useEffect(() => {
    if (wantsPosition && geoStatus === "granted" && position) {
      // Reflète une position externe (navigator.geolocation) dans le
      // formulaire une fois acquise, seulement après une demande explicite
      // (wantsPosition) — voir handleUsePosition ci-dessous.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLatitude(position.lat);
      setLongitude(position.lng);
    }
  }, [wantsPosition, geoStatus, position]);

  function handleUsePosition() {
    setWantsPosition(true);
    if (geoStatus === "idle" || geoStatus === "denied") {
      request();
    }
  }

  function handleClearPosition() {
    setWantsPosition(false);
    setLatitude(null);
    setLongitude(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const cleanTitre = titre.trim();
    const cleanDescription = description.trim();
    const prix = Number(prixDigits);

    if (!cleanTitre || !cleanDescription || !categorieId || !prixDigits || prix <= 0) {
      setFormError("Complète le titre, la description, le prix et la catégorie.");
      return;
    }

    await onSubmit({
      titre: cleanTitre,
      description: cleanDescription,
      prix,
      categorieId,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
    });
  }

  return (
    // noValidate : la validation HTML5 native (attributs `required`) bloquerait
    // silencieusement l'événement submit avant handleSubmit — le message
    // groupé ci-dessus (plus lisible, cohérent avec le reste du design system)
    // remplace intentionnellement les bulles de validation du navigateur.
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[15px]">
      {formError ? <Alert variant="danger">{formError}</Alert> : null}

      <Input
        label="Titre du produit"
        value={titre}
        onChange={(event) => setTitre(event.target.value)}
        maxLength={140}
        placeholder="Pagne wax 6 yards"
        required
        disabled={submitting}
      />

      <div className="flex flex-col gap-[7px]">
        <label htmlFor="description" className="text-[13px] text-brand-muted">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={5000}
          rows={5}
          placeholder="Décris ton produit : état, matière, quantité disponible…"
          required
          disabled={submitting}
          className="w-full resize-y rounded-md border border-border-strong bg-white px-[14px] py-[14px] text-[15px] text-ink outline-none transition-colors placeholder:text-brand-placeholder focus-visible:shadow-focus-brand focus:border-brand"
        />
      </div>

      <Input
        label="Prix (GNF)"
        inputMode="numeric"
        value={formatDigits(prixDigits)}
        onChange={(event) => setPrixDigits(digitsOnly(event.target.value))}
        hint="Montant en francs guinéens, sans centimes."
        placeholder="185 000"
        required
        disabled={submitting}
      />

      <div className="flex flex-col gap-[7px]">
        <label htmlFor="categorie" className="text-[13px] text-brand-muted">
          Catégorie
        </label>
        <select
          id="categorie"
          value={categorieId}
          onChange={(event) => setCategorieId(event.target.value)}
          required
          disabled={submitting}
          className="w-full rounded-md border border-border-strong bg-white px-[14px] py-[14px] text-[15px] text-ink outline-none transition-colors focus-visible:shadow-focus-brand focus:border-brand"
        >
          <option value="" disabled>
            Choisir une catégorie
          </option>
          {categories.map((categorie) => (
            <option key={categorie.id} value={categorie.id}>
              {categorie.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-brand-muted">Position — optionnelle</span>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUsePosition}
            disabled={submitting || geoStatus === "asking"}
          >
            {geoStatus === "asking" ? "Localisation…" : "Utiliser ma position"}
          </Button>
          {latitude !== null && longitude !== null ? (
            <span className="text-[12.5px] text-brand-subtle">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}{" "}
              <button
                type="button"
                onClick={handleClearPosition}
                className="underline hover:text-brand"
              >
                Retirer
              </button>
            </span>
          ) : wantsPosition && geoStatus === "denied" ? (
            <span className="text-[12.5px] text-danger">
              Position indisponible — tu peux continuer sans.
            </span>
          ) : null}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting} className="mt-1">
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
