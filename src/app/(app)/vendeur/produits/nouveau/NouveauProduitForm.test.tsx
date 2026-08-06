import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { GeoProvider } from "@/lib/geo";
import type { ProductView } from "@/lib/products/types";

import { NouveauProduitForm } from "./NouveauProduitForm";

const { listCategoriesMock, createProductMock, pushMock } = vi.hoisted(() => ({
  listCategoriesMock: vi.fn(),
  createProductMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/lib/categories/api", () => ({ listCategories: listCategoriesMock }));
vi.mock("@/lib/products/vendor-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/products/vendor-api")>("@/lib/products/vendor-api");
  return { ...actual, createProduct: createProductMock };
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const CATEGORIES = [
  { id: "c1", nom: "Mode & tissus", slug: "mode-tissus", parentId: null },
  { id: "c2", nom: "Alimentation", slug: "alimentation", parentId: null },
];

function makeProduct(overrides: Partial<ProductView> = {}): ProductView {
  return {
    id: "p1",
    titre: "Pagne wax",
    description: "Tissu wax authentique.",
    prix: "185000",
    categorieId: "c1",
    vendeurId: "v1",
    latitude: null,
    longitude: null,
    actif: true,
    dateCreation: "2026-08-01T00:00:00.000Z",
    dateMiseAJour: "2026-08-01T00:00:00.000Z",
    categorie: { id: "c1", nom: "Mode & tissus", slug: "mode-tissus" },
    vendeur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "VERIFIE" },
    photos: [],
    ...overrides,
  };
}

function renderForm() {
  return render(
    <GeoProvider>
      <NouveauProduitForm />
    </GeoProvider>,
  );
}

describe("NouveauProduitForm", () => {
  beforeEach(() => {
    listCategoriesMock.mockReset();
    createProductMock.mockReset();
    pushMock.mockClear();
    listCategoriesMock.mockResolvedValue(CATEGORIES);
  });

  it("submits the payload built from the form and redirects to the edition page", async () => {
    const user = userEvent.setup();
    createProductMock.mockResolvedValueOnce(makeProduct({ id: "p1" }));
    renderForm();

    await screen.findByRole("option", { name: "Mode & tissus" });

    await user.type(screen.getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(screen.getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(screen.getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "c1");
    await user.click(screen.getByRole("button", { name: "Publier le produit" }));

    await waitFor(() =>
      expect(createProductMock).toHaveBeenCalledWith({
        titre: "Pagne wax",
        description: "Tissu wax authentique.",
        prix: 185000,
        categorieId: "c1",
        latitude: undefined,
        longitude: undefined,
      }),
    );
    expect(pushMock).toHaveBeenCalledWith("/vendeur/produits/p1");
  });

  it("leaves the submitting state after success instead of staying stuck on « Publication… » (T37)", async () => {
    // router.push (App Router, next/navigation) est fire-and-forget : le mock
    // ne fait rien de plus qu'enregistrer l'appel, la page ne se démonte donc
    // pas ici — reproduit le cas prod où la transition traîne/n'aboutit pas.
    const user = userEvent.setup();
    createProductMock.mockResolvedValueOnce(makeProduct({ id: "p1" }));
    renderForm();

    await screen.findByRole("option", { name: "Mode & tissus" });
    await user.type(screen.getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(screen.getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(screen.getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "c1");
    await user.click(screen.getByRole("button", { name: "Publier le produit" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/vendeur/produits/p1"));

    expect(screen.queryByText("Publication…")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publication…" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuer pour ajouter tes photos" })).toHaveAttribute(
      "href",
      "/vendeur/produits/p1",
    );
  });

  it("shows a clear message and a catalogue link when PRODUCT_LIMIT_REACHED is returned", async () => {
    const user = userEvent.setup();
    createProductMock.mockRejectedValueOnce(
      new ApiError(409, "Limite de 30 produits actifs atteinte", "PRODUCT_LIMIT_REACHED"),
    );
    renderForm();

    await screen.findByRole("option", { name: "Mode & tissus" });
    await user.type(screen.getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(screen.getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(screen.getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "c1");
    await user.click(screen.getByRole("button", { name: "Publier le produit" }));

    expect(
      await screen.findByText(/atteint la limite de 30 produits actifs/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mon catalogue" })).toHaveAttribute(
      "href",
      "/vendeur/catalogue",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
