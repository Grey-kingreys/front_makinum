"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { Alert, Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { CategoryListItem } from "@/lib/categories/types";
import { useGeo } from "@/lib/geo";

/**
 * Formulaire produit partagé entre création (/vendeur/produits/nouveau) et
 * édition (/vendeur/produits/[id]) — titre, description, prix, catégorie,
 * position optionnelle. Le prix est manipulé en francs guinéens entiers
 * (GNF n'a pas de subdivision courante) : la valeur affichée est formatée
 * avec séparateur de milliers, la valeur soumise est un nombre entier.
 *
 * `vendorLocation` (T66b) : lieu de vente du compte (`user.lieuVente`,
 * réglé une fois sur /vendeur/parametres), transmis UNIQUEMENT par l'écran
 * de création (`NouveauProduitForm`) — jamais par l'édition
 * (`EditionProduitView`, qui ne passe que `initialValues` tirées du
 * produit). ProductForm reste volontairement sans dépendance à `useAuth`
 * (pas de `<AuthProvider>` requis dans ses tests) : c'est à l'appelant de
 * lire la session et de décider si ce contexte de création justifie le
 * pré-remplissage.
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
  /**
   * Lieu de vente du compte vendeur (T66b) — passé uniquement en création
   * (voir doc du module ci-dessus). `undefined`/`null` : pas de
   * pré-remplissage, comportement T65 inchangé.
   */
  vendorLocation?: { latitude: number; longitude: number } | null;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  onSubmit: (payload: ProductFormPayload) => void | Promise<void>;
}

/** Erreurs de validation par champ (T32 — remplace le message groupé). */
interface ProductFormErrors {
  titre?: string;
  description?: string;
  prix?: string;
  categorie?: string;
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
  vendorLocation,
  submitLabel,
  submittingLabel,
  submitting,
  onSubmit,
}: ProductFormProps) {
  const { status: geoStatus, position, request } = useGeo();

  // Pré-remplissage T66b : seulement si l'appelant a fourni un lieu de vente
  // (création uniquement, voir doc du module) ET qu'aucune position n'est
  // déjà dans le formulaire (édition avec position produit existante, ou
  // `initialValues` explicites) — `initialValues` reste toujours prioritaire.
  const hasInitialPosition = initialValues?.latitude != null && initialValues?.longitude != null;
  const initialFromVendorLocation = !hasInitialPosition && vendorLocation != null;

  const [titre, setTitre] = useState(initialValues?.titre ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [prixDigits, setPrixDigits] = useState(initialValues?.prix ?? "");
  const [categorieId, setCategorieId] = useState(initialValues?.categorieId ?? "");
  const [latitude, setLatitude] = useState<number | null>(
    initialValues?.latitude ?? vendorLocation?.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialValues?.longitude ?? vendorLocation?.longitude ?? null,
  );
  const [wantsPosition, setWantsPosition] = useState(false);
  // Vrai tant que la position affichée est celle du lieu de vente du compte,
  // jamais retouchée pour CE produit — bascule à `false` dès que le vendeur
  // recapture explicitement sa position (elle devient « la » position de ce
  // produit, plus celle du compte) ou la retire. Ne concerne que la
  // création : `initialFromVendorLocation` est toujours `false` en édition
  // (ProductForm n'y reçoit jamais `vendorLocation`).
  const [fromVendorLocation, setFromVendorLocation] = useState(initialFromVendorLocation);
  const [errors, setErrors] = useState<ProductFormErrors>({});

  const noCategoriesAvailable = categories.length === 0;

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

  function clearFieldError(field: keyof ProductFormErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleTitreChange(event: ChangeEvent<HTMLInputElement>) {
    setTitre(event.target.value);
    clearFieldError("titre");
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDescription(event.target.value);
    clearFieldError("description");
  }

  function handlePrixChange(event: ChangeEvent<HTMLInputElement>) {
    setPrixDigits(digitsOnly(event.target.value));
    clearFieldError("prix");
  }

  function handleCategorieChange(event: ChangeEvent<HTMLSelectElement>) {
    setCategorieId(event.target.value);
    clearFieldError("categorie");
  }

  function handleUsePosition() {
    setWantsPosition(true);
    // Une recapture explicite remplace le lieu de vente pré-rempli par la
    // position réelle du vendeur pour CE produit — le message repasse au
    // « ✓ Position enregistrée » standard dès que la nouvelle position
    // arrive (voir l'effet ci-dessus).
    setFromVendorLocation(false);
    if (geoStatus === "idle" || geoStatus === "denied") {
      request();
    }
  }

  function handleClearPosition() {
    setWantsPosition(false);
    setFromVendorLocation(false);
    setLatitude(null);
    setLongitude(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanTitre = titre.trim();
    const cleanDescription = description.trim();
    const prix = Number(prixDigits);

    const nextErrors: ProductFormErrors = {};
    if (!cleanTitre) nextErrors.titre = "Le titre est requis.";
    if (!cleanDescription) nextErrors.description = "La description est requise.";
    if (!prixDigits || prix <= 0) nextErrors.prix = "Indique un prix supérieur à 0.";
    if (!categorieId) nextErrors.categorie = "Choisis une catégorie.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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
    // silencieusement l'événement submit avant handleSubmit — les erreurs par
    // champ ci-dessous (rattachées à chaque champ, cohérentes avec le reste du
    // design system) remplacent intentionnellement les bulles de validation
    // du navigateur.
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[15px]">
      <Input
        label="Titre du produit"
        value={titre}
        onChange={handleTitreChange}
        maxLength={140}
        placeholder="Pagne wax 6 yards"
        required
        disabled={submitting}
        error={errors.titre}
      />

      <div className="flex flex-col gap-[7px]">
        <label htmlFor="description" className="text-[13px] text-brand-muted">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={handleDescriptionChange}
          maxLength={5000}
          rows={5}
          placeholder="Décris ton produit : état, matière, quantité disponible…"
          required
          disabled={submitting}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? "description-error" : undefined}
          className={cn(
            "w-full resize-y rounded-md border bg-white px-[14px] py-[14px] text-[15px] text-ink outline-none transition-colors placeholder:text-brand-placeholder focus-visible:shadow-focus-brand",
            errors.description ? "border-danger focus:border-danger" : "border-border-strong focus:border-brand",
          )}
        />
        {errors.description ? (
          <p id="description-error" className="text-[12.5px] text-danger">
            {errors.description}
          </p>
        ) : null}
      </div>

      <Input
        label="Prix (GNF)"
        inputMode="numeric"
        value={formatDigits(prixDigits)}
        onChange={handlePrixChange}
        hint="Montant en francs guinéens, sans centimes."
        placeholder="185 000"
        required
        disabled={submitting}
        error={errors.prix}
      />

      <div className="flex flex-col gap-[7px]">
        <label htmlFor={noCategoriesAvailable ? undefined : "categorie"} className="text-[13px] text-brand-muted">
          Catégorie
        </label>
        {noCategoriesAvailable ? (
          <Alert variant="danger">
            Aucune catégorie disponible pour l&apos;instant — contacte l&apos;équipe Makinum depuis la page Aide.
          </Alert>
        ) : (
          <>
            <select
              id="categorie"
              value={categorieId}
              onChange={handleCategorieChange}
              required
              disabled={submitting}
              aria-invalid={errors.categorie ? true : undefined}
              aria-describedby={errors.categorie ? "categorie-error" : undefined}
              className={cn(
                "w-full rounded-md border bg-white px-[14px] py-[14px] text-[15px] text-ink outline-none transition-colors focus-visible:shadow-focus-brand",
                errors.categorie ? "border-danger focus:border-danger" : "border-border-strong focus:border-brand",
              )}
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
            {errors.categorie ? (
              <p id="categorie-error" className="text-[12.5px] text-danger">
                {errors.categorie}
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-brand-muted">
          Où les acheteurs peuvent te trouver ? — optionnel
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUsePosition}
            disabled={submitting || geoStatus === "asking"}
          >
            {geoStatus === "asking"
              ? "Localisation…"
              : "Je suis sur mon lieu de vente — utiliser ma position"}
          </Button>
          {latitude !== null && longitude !== null ? (
            <span className="text-[12.5px] text-brand-subtle">
              {fromVendorLocation
                ? "✓ Position de ton lieu de vente — tu peux la retirer ou la remplacer pour ce produit."
                : "✓ Position enregistrée"}{" "}
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
        {latitude === null || longitude === null ? (
          <p className="text-[12.5px] text-brand-subtle">
            Sans position, ton produit n&apos;apparaîtra pas dans le tri par distance.
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={submitting || noCategoriesAvailable}
        aria-busy={submitting}
        className="mt-1"
      >
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
