import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { AdminCategoryListItem } from "@/lib/categories/types";

import { CategoriesView } from "./CategoriesView";

const { listAdminCategoriesMock, createCategoryMock, updateCategoryMock } = vi.hoisted(() => ({
  listAdminCategoriesMock: vi.fn(),
  createCategoryMock: vi.fn(),
  updateCategoryMock: vi.fn(),
}));

vi.mock("@/lib/categories/api", () => ({
  listAdminCategories: listAdminCategoriesMock,
  createCategory: createCategoryMock,
  updateCategory: updateCategoryMock,
}));

function makeCategory(overrides: Partial<AdminCategoryListItem> = {}): AdminCategoryListItem {
  return {
    id: "c1",
    nom: "Alimentation",
    slug: "alimentation",
    parentId: null,
    actif: true,
    ...overrides,
  };
}

describe("CategoriesView", () => {
  beforeEach(() => {
    listAdminCategoriesMock.mockReset();
    createCategoryMock.mockReset();
    updateCategoryMock.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders active categories in the main list and inactive ones in a separate section", async () => {
    listAdminCategoriesMock.mockResolvedValue([
      makeCategory({ id: "c1", nom: "Alimentation", slug: "alimentation", actif: true }),
      makeCategory({ id: "c2", nom: "Mode & tissus", slug: "mode-tissus", actif: false }),
    ]);

    render(<CategoriesView />);

    expect(await screen.findByText("Alimentation")).toBeInTheDocument();
    expect(screen.getByText("Mode & tissus")).toBeInTheDocument();
    expect(screen.getByText("Inactives")).toBeInTheDocument();

    const badges = screen.getAllByText(/^(Actif|Inactif)$/);
    expect(badges.map((el) => el.textContent)).toEqual(["Actif", "Inactif"]);
  });

  it("shows the parent's name for a category that has one", async () => {
    listAdminCategoriesMock.mockResolvedValue([
      makeCategory({ id: "c1", nom: "Mode", slug: "mode", actif: true, parentId: null }),
      makeCategory({ id: "c2", nom: "Tissus", slug: "tissus", actif: true, parentId: "c1" }),
    ]);

    render(<CategoriesView />);

    expect(await screen.findByText(/Parent : Mode/)).toBeInTheDocument();
  });

  it("creates a category — POST with trimmed nom, optional slug/parent omitted when empty", async () => {
    listAdminCategoriesMock.mockResolvedValue([makeCategory()]);
    createCategoryMock.mockResolvedValueOnce(
      makeCategory({ id: "c2", nom: "Services", slug: "services" }),
    );
    const user = userEvent.setup();

    render(<CategoriesView />);
    await screen.findByText("Alimentation");

    await user.click(screen.getByRole("button", { name: "Ajouter une catégorie" }));
    await user.type(screen.getByLabelText("Nom"), "  Services  ");
    await user.click(screen.getByRole("button", { name: "Créer la catégorie" }));

    await waitFor(() =>
      expect(createCategoryMock).toHaveBeenCalledWith({
        nom: "Services",
        slug: undefined,
        parentId: undefined,
      }),
    );
    // La liste est rafraîchie après création réussie.
    expect(listAdminCategoriesMock).toHaveBeenCalledTimes(2);
  });

  it("maps a SLUG_ALREADY_USED creation error onto the slug field", async () => {
    listAdminCategoriesMock.mockResolvedValue([makeCategory()]);
    createCategoryMock.mockRejectedValueOnce(
      new ApiError(409, "Ce slug est déjà utilisé", "SLUG_ALREADY_USED"),
    );
    const user = userEvent.setup();

    render(<CategoriesView />);
    await screen.findByText("Alimentation");

    await user.click(screen.getByRole("button", { name: "Ajouter une catégorie" }));
    await user.type(screen.getByLabelText("Nom"), "Alimentation bis");
    await user.type(screen.getByLabelText("Slug — optionnel"), "alimentation");
    await user.click(screen.getByRole("button", { name: "Créer la catégorie" }));

    expect(await screen.findByText("Ce slug est déjà utilisé.")).toBeInTheDocument();
    // Le message est bien rattaché au champ slug (aria-describedby / erreur inline), pas une alerte générale.
    expect(screen.getByLabelText("Slug — optionnel")).toHaveAttribute("aria-invalid", "true");
    // La création n'est pas considérée réussie : pas de second appel de liste.
    expect(listAdminCategoriesMock).toHaveBeenCalledTimes(1);
  });

  it("maps a CATEGORY_CYCLE / PARENT_NOT_FOUND creation error onto the parent field", async () => {
    listAdminCategoriesMock.mockResolvedValue([makeCategory()]);
    createCategoryMock.mockRejectedValueOnce(
      new ApiError(404, "Catégorie parente introuvable", "PARENT_NOT_FOUND"),
    );
    const user = userEvent.setup();

    render(<CategoriesView />);
    await screen.findByText("Alimentation");

    await user.click(screen.getByRole("button", { name: "Ajouter une catégorie" }));
    await user.type(screen.getByLabelText("Nom"), "Nouvelle");
    await user.click(screen.getByRole("button", { name: "Créer la catégorie" }));

    expect(await screen.findByText("Catégorie parente introuvable.")).toBeInTheDocument();
  });

  it("deactivates a category through a confirmation naming the consequence, then PATCHes actif:false", async () => {
    listAdminCategoriesMock.mockResolvedValue([makeCategory({ actif: true })]);
    updateCategoryMock.mockResolvedValueOnce(makeCategory({ actif: false }));
    const user = userEvent.setup();

    render(<CategoriesView />);
    await screen.findByText("Alimentation");

    await user.click(screen.getByRole("button", { name: "Désactiver" }));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringMatching(/disparaîtra de la recherche et de la publication/),
    );
    await waitFor(() => expect(updateCategoryMock).toHaveBeenCalledWith("c1", { actif: false }));
  });

  it("does not call the API when the deactivation confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    listAdminCategoriesMock.mockResolvedValue([makeCategory({ actif: true })]);
    const user = userEvent.setup();

    render(<CategoriesView />);
    await screen.findByText("Alimentation");

    await user.click(screen.getByRole("button", { name: "Désactiver" }));

    expect(updateCategoryMock).not.toHaveBeenCalled();
  });

  it("reactivates an inactive category after confirmation", async () => {
    listAdminCategoriesMock.mockResolvedValue([makeCategory({ actif: false })]);
    updateCategoryMock.mockResolvedValueOnce(makeCategory({ actif: true }));
    const user = userEvent.setup();

    render(<CategoriesView />);
    await screen.findByText("Alimentation");

    await user.click(screen.getByRole("button", { name: "Réactiver" }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/redeviendra visible/));
    await waitFor(() => expect(updateCategoryMock).toHaveBeenCalledWith("c1", { actif: true }));
  });

  it("edits a category — PATCHes only the changed fields (nom here)", async () => {
    listAdminCategoriesMock.mockResolvedValue([makeCategory({ nom: "Alimentation" })]);
    updateCategoryMock.mockResolvedValueOnce(makeCategory({ nom: "Alimentation locale" }));
    const user = userEvent.setup();

    render(<CategoriesView />);
    await screen.findByText("Alimentation");

    await user.click(screen.getByRole("button", { name: "Modifier" }));
    const nomField = screen.getByLabelText("Nom");
    await user.clear(nomField);
    await user.type(nomField, "Alimentation locale");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(updateCategoryMock).toHaveBeenCalledWith("c1", { nom: "Alimentation locale" }),
    );
  });

  it("shows a retry action when the list fails to load", async () => {
    listAdminCategoriesMock.mockRejectedValueOnce(new Error("boom"));
    listAdminCategoriesMock.mockResolvedValueOnce([makeCategory()]);
    const user = userEvent.setup();

    render(<CategoriesView />);

    expect(await screen.findByText("Impossible de charger les catégories.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByText("Alimentation")).toBeInTheDocument();
  });
});
