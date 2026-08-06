"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alert, Badge, Button, Card, ConfirmDialog, Input } from "@/components/ui";
import {
  createCategory,
  listAdminCategories,
  updateCategory,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/categories/api";
import { describeCategoryError, describeCategoryFormError } from "@/lib/categories/errors";
import type { AdminCategoryListItem } from "@/lib/categories/types";

interface CategoryFormValues {
  nom: string;
  slug: string;
  parentId: string;
}

interface CategoryFormErrors {
  nom?: string;
  slug?: string;
  parent?: string;
  general?: string;
}

const EMPTY_FORM: CategoryFormValues = { nom: "", slug: "", parentId: "" };

/** Traduit une erreur API (POST/PATCH) en erreurs de champ pour le formulaire. */
function fieldErrorsFrom(error: unknown): CategoryFormErrors {
  const { field, message } = describeCategoryFormError(error);
  if (field === "nom") return { nom: message };
  if (field === "slug") return { slug: message };
  if (field === "parent") return { parent: message };
  return { general: message };
}

function CategoryFormFields({
  values,
  errors,
  parentOptions,
  disabled,
  onChange,
}: {
  values: CategoryFormValues;
  errors: CategoryFormErrors;
  parentOptions: AdminCategoryListItem[];
  disabled: boolean;
  onChange: (patch: Partial<CategoryFormValues>) => void;
}) {
  return (
    <div className="flex flex-col gap-[15px]">
      <Input
        label="Nom"
        value={values.nom}
        onChange={(event) => onChange({ nom: event.target.value })}
        maxLength={80}
        required
        disabled={disabled}
        error={errors.nom}
      />
      <Input
        label="Slug — optionnel"
        placeholder="Laisse vide pour générer automatiquement depuis le nom"
        value={values.slug}
        onChange={(event) => onChange({ slug: event.target.value })}
        maxLength={100}
        disabled={disabled}
        error={errors.slug}
        hint="Généré automatiquement en kebab-case à partir du nom si laissé vide."
      />
      <label className="flex flex-col gap-[7px] text-[13px] text-brand-muted">
        Catégorie parente — optionnel
        <select
          value={values.parentId}
          onChange={(event) => onChange({ parentId: event.target.value })}
          disabled={disabled}
          className="rounded-md border border-border-strong bg-white px-3 py-2.5 text-[14px] text-ink outline-none focus-visible:shadow-focus-brand"
        >
          <option value="">Aucune — catégorie racine</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.nom}
            </option>
          ))}
        </select>
      </label>
      {errors.parent ? <p className="text-[12.5px] text-danger">{errors.parent}</p> : null}
    </div>
  );
}

interface RowState {
  toggleSubmitting: boolean;
  toggleError: string | null;
}

const DEFAULT_ROW_STATE: RowState = { toggleSubmitting: false, toggleError: null };

function CategoryRow({
  category,
  parentName,
  parentOptions,
  editing,
  editValues,
  editErrors,
  editSubmitting,
  rowState,
  onStartEdit,
  onCancelEdit,
  onEditChange,
  onSubmitEdit,
  onToggleActif,
}: {
  category: AdminCategoryListItem;
  parentName: string | null;
  parentOptions: AdminCategoryListItem[];
  editing: boolean;
  editValues: CategoryFormValues;
  editErrors: CategoryFormErrors;
  editSubmitting: boolean;
  rowState: RowState;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (patch: Partial<CategoryFormValues>) => void;
  onSubmitEdit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleActif: () => void;
}) {
  return (
    <div className="border-b border-beige-soft px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[14.5px] font-medium text-ink">{category.nom}</div>
          <div className="text-[12.5px] text-brand-faint">
            /{category.slug}
            {parentName ? ` · Parent : ${parentName}` : ""}
          </div>
        </div>
        <Badge variant={category.actif ? "verifie" : "neutral"} dot>
          {category.actif ? "Actif" : "Inactif"}
        </Badge>
      </div>

      {editing ? (
        <form onSubmit={onSubmitEdit} className="mt-3 border-t border-beige pt-4">
          <CategoryFormFields
            values={editValues}
            errors={editErrors}
            parentOptions={parentOptions}
            disabled={editSubmitting}
            onChange={onEditChange}
          />
          {editErrors.general ? (
            <Alert variant="danger" className="mt-3">
              {editErrors.general}
            </Alert>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Button type="submit" size="sm" disabled={editSubmitting} aria-busy={editSubmitting}>
              {editSubmitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancelEdit}
              disabled={editSubmitting}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onStartEdit}>
            Modifier
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleActif}
            disabled={rowState.toggleSubmitting}
            className={
              category.actif ? "border-tint-danger-border text-danger hover:border-danger" : undefined
            }
          >
            {rowState.toggleSubmitting ? "…" : category.actif ? "Désactiver" : "Réactiver"}
          </Button>
        </div>
      )}

      {rowState.toggleError ? <p className="mt-2 text-[12.5px] text-danger">{rowState.toggleError}</p> : null}
    </div>
  );
}

/**
 * « Catégories » (/admin/categories, T31b) : liste plate des catégories
 * (actives + inactives, section séparée pour les inactives), création,
 * édition (nom, slug, parent — détachable) et désactivation/réactivation
 * logique (PATCH `actif`, confirmée) — pas de suppression physique, décision
 * V1 actée (voir docs/plans/BACKLOG.md, T31). Les erreurs API sont mappées
 * sur le champ concerné du formulaire (voir lib/categories/errors.ts).
 */
export function CategoriesView() {
  const [categories, setCategories] = useState<AdminCategoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [confirmTarget, setConfirmTarget] = useState<AdminCategoryListItem | null>(null);

  const [creating, setCreating] = useState(false);
  const [createValues, setCreateValues] = useState<CategoryFormValues>(EMPTY_FORM);
  const [createErrors, setCreateErrors] = useState<CategoryFormErrors>({});
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<CategoryFormValues>(EMPTY_FORM);
  const [editInitial, setEditInitial] = useState<CategoryFormValues | null>(null);
  const [editErrors, setEditErrors] = useState<CategoryFormErrors>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAdminCategories();
      setCategories(list);
    } catch (err) {
      setError(describeCategoryError(err, "Impossible de charger les catégories."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial, même convention que les autres écrans admin (VendeursView, ModerationView).
    fetchCategories();
  }, [fetchCategories]);

  function rowStateFor(id: string): RowState {
    return rowStates[id] ?? DEFAULT_ROW_STATE;
  }

  function patchRowState(id: string, patch: Partial<RowState>) {
    setRowStates((prev) => ({ ...prev, [id]: { ...(prev[id] ?? DEFAULT_ROW_STATE), ...patch } }));
  }

  function parentNameFor(category: AdminCategoryListItem): string | null {
    if (!category.parentId) return null;
    return categories.find((item) => item.id === category.parentId)?.nom ?? null;
  }

  function openCreate() {
    setCreating(true);
    setCreateValues(EMPTY_FORM);
    setCreateErrors({});
  }

  function closeCreate() {
    setCreating(false);
    setCreateValues(EMPTY_FORM);
    setCreateErrors({});
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nom = createValues.nom.trim();
    if (!nom) {
      setCreateErrors({ nom: "Le nom est requis." });
      return;
    }

    setCreateSubmitting(true);
    setCreateErrors({});
    try {
      const input: CreateCategoryInput = {
        nom,
        slug: createValues.slug.trim() || undefined,
        parentId: createValues.parentId || undefined,
      };
      await createCategory(input);
      closeCreate();
      await fetchCategories();
    } catch (err) {
      setCreateErrors(fieldErrorsFrom(err));
    } finally {
      setCreateSubmitting(false);
    }
  }

  function startEdit(category: AdminCategoryListItem) {
    const initial: CategoryFormValues = {
      nom: category.nom,
      slug: category.slug,
      parentId: category.parentId ?? "",
    };
    setEditingId(category.id);
    setEditValues(initial);
    setEditInitial(initial);
    setEditErrors({});
  }

  function cancelEdit() {
    setEditingId(null);
    setEditInitial(null);
    setEditErrors({});
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>, category: AdminCategoryListItem) {
    event.preventDefault();
    if (!editInitial) return;

    const nom = editValues.nom.trim();
    if (!nom) {
      setEditErrors({ nom: "Le nom est requis." });
      return;
    }

    const payload: UpdateCategoryInput = {};
    if (nom !== editInitial.nom) payload.nom = nom;

    const slug = editValues.slug.trim();
    if (slug && slug !== editInitial.slug) payload.slug = slug;

    if (editValues.parentId !== editInitial.parentId) {
      payload.parentId = editValues.parentId || null;
    }

    if (Object.keys(payload).length === 0) {
      cancelEdit();
      return;
    }

    setEditSubmitting(true);
    setEditErrors({});
    try {
      await updateCategory(category.id, payload);
      cancelEdit();
      await fetchCategories();
    } catch (err) {
      setEditErrors(fieldErrorsFrom(err));
    } finally {
      setEditSubmitting(false);
    }
  }

  function toggleActifMessage(category: AdminCategoryListItem): string {
    return category.actif
      ? `Désactiver « ${category.nom} » ? Elle disparaîtra de la recherche et de la publication ; les produits existants continueront de la référencer.`
      : `Réactiver « ${category.nom} » ? Elle redeviendra visible dans la recherche et la publication.`;
  }

  function handleToggleActif(category: AdminCategoryListItem) {
    setConfirmTarget(category);
  }

  async function confirmToggleActif() {
    const category = confirmTarget;
    if (!category) return;
    setConfirmTarget(null);

    patchRowState(category.id, { toggleSubmitting: true, toggleError: null });
    try {
      await updateCategory(category.id, { actif: !category.actif });
      await fetchCategories();
    } catch (err) {
      patchRowState(category.id, {
        toggleError: describeCategoryError(err, "Impossible de mettre à jour cette catégorie."),
      });
    } finally {
      patchRowState(category.id, { toggleSubmitting: false });
    }
  }

  function renderRow(category: AdminCategoryListItem) {
    const editing = editingId === category.id;
    return (
      <CategoryRow
        key={category.id}
        category={category}
        parentName={parentNameFor(category)}
        parentOptions={categories.filter((item) => item.id !== category.id)}
        editing={editing}
        editValues={editing ? editValues : EMPTY_FORM}
        editErrors={editing ? editErrors : {}}
        editSubmitting={editing && editSubmitting}
        rowState={rowStateFor(category.id)}
        onStartEdit={() => startEdit(category)}
        onCancelEdit={cancelEdit}
        onEditChange={(patch) => setEditValues((prev) => ({ ...prev, ...patch }))}
        onSubmitEdit={(event) => handleEditSubmit(event, category)}
        onToggleActif={() => handleToggleActif(category)}
      />
    );
  }

  const activeCategories = categories.filter((category) => category.actif);
  const inactiveCategories = categories.filter((category) => !category.actif);

  return (
    <div className="mx-auto max-w-[900px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
            Catégories
          </h1>
          <p className="text-[14.5px] text-brand-subtle">
            Désactiver une catégorie ne la supprime pas : les produits existants continuent de la
            référencer.
          </p>
        </div>
        {!creating ? <Button onClick={openCreate}>Ajouter une catégorie</Button> : null}
      </div>

      {creating ? (
        <Card className="mb-6">
          <h2 className="mb-4 font-display text-[16px] font-bold text-ink">Nouvelle catégorie</h2>
          <form onSubmit={handleCreateSubmit}>
            <CategoryFormFields
              values={createValues}
              errors={createErrors}
              parentOptions={categories}
              disabled={createSubmitting}
              onChange={(patch) => setCreateValues((prev) => ({ ...prev, ...patch }))}
            />
            {createErrors.general ? (
              <Alert variant="danger" className="mt-3">
                {createErrors.general}
              </Alert>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={createSubmitting} aria-busy={createSubmitting}>
                {createSubmitting ? "Création…" : "Créer la catégorie"}
              </Button>
              <Button type="button" variant="outline" onClick={closeCreate} disabled={createSubmitting}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {error ? (
        <Alert variant="danger" className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchCategories()}>
            Réessayer
          </Button>
        </Alert>
      ) : null}

      {loading && categories.length === 0 ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-beige-soft" />
          ))}
        </div>
      ) : categories.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-white px-6 py-16 text-center text-[14.5px] text-brand-subtle">
          Aucune catégorie pour l&apos;instant.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[18px] border border-border bg-white">
            {activeCategories.map((category) => renderRow(category))}
          </div>

          {inactiveCategories.length > 0 ? (
            <div className="mt-8">
              <h2 className="mb-3 font-display text-[16px] font-bold text-brand-subtle">Inactives</h2>
              <div className="overflow-hidden rounded-[18px] border border-dashed border-border-strong bg-beige-soft/50">
                {inactiveCategories.map((category) => renderRow(category))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        title={confirmTarget?.actif ? "Désactiver cette catégorie ?" : "Réactiver cette catégorie ?"}
        description={confirmTarget ? toggleActifMessage(confirmTarget) : null}
        confirmLabel={confirmTarget?.actif ? "Désactiver" : "Réactiver"}
        variant={confirmTarget?.actif ? "danger" : "default"}
        onConfirm={confirmToggleActif}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
