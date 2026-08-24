import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PublicUser } from "@/lib/auth/types";
import { GeoProvider } from "@/lib/geo";
import type { ProductView } from "@/lib/products/types";

import { NouveauProduitForm } from "./NouveauProduitForm";

const { listCategoriesMock, createProductMock, pushMock, useAuthMock } = vi.hoisted(() => ({
  listCategoriesMock: vi.fn(),
  createProductMock: vi.fn(),
  pushMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("@/lib/categories/api", () => ({ listCategories: listCategoriesMock }));
vi.mock("@/lib/products/vendor-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/products/vendor-api")>("@/lib/products/vendor-api");
  return { ...actual, createProduct: createProductMock };
});
vi.mock("@/lib/auth", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const CATEGORIES = [
  { id: "c1", nom: "Mode & tissus", slug: "mode-tissus", parentId: null },
  { id: "c2", nom: "Alimentation", slug: "alimentation", parentId: null },
];

function makeUser(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: "v1",
    nom: "Fatoumata Bangoura",
    telephone: "+224622000000",
    telephoneVerifie: true,
    email: null,
    emailVerifie: false,
    role: "VENDEUR",
    statutVendeur: "LIBRE",
    statutCompte: "ACTIF",
    vendeurValide: true,
    autoriseAdminPublication: false,
    latitude: null,
    longitude: null,
    lieuVente: null,
    ...overrides,
  };
}

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

function renderForm(user: PublicUser = makeUser()) {
  useAuthMock.mockReturnValue({ user, loading: false, login: vi.fn(), logout: vi.fn(), refresh: vi.fn() });
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
    useAuthMock.mockReset();
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

  it("shows a clear message when the vendor account is not yet validated (VENDOR_NOT_VALIDATED)", async () => {
    const user = userEvent.setup();
    createProductMock.mockRejectedValueOnce(
      new ApiError(
        403,
        "Votre compte vendeur doit être validé par un administrateur avant de publier des produits",
        "VENDOR_NOT_VALIDATED",
      ),
    );
    renderForm();

    await screen.findByRole("option", { name: "Mode & tissus" });
    await user.type(screen.getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(screen.getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(screen.getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "c1");
    await user.click(screen.getByRole("button", { name: "Publier le produit" }));

    expect(
      await screen.findByText(/doit être validé par un administrateur/),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  describe("pré-remplissage depuis le lieu de vente du compte (T66b)", () => {
    it("pre-fills the position and shows the vendor-location message when user.lieuVente is set", async () => {
      renderForm(makeUser({ lieuVente: { latitude: 9.6412, longitude: -13.5784 } }));

      await screen.findByRole("option", { name: "Mode & tissus" });

      expect(
        screen.getByText(
          "✓ Position de ton lieu de vente — tu peux la retirer ou la remplacer pour ce produit.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText("✓ Position enregistrée")).not.toBeInTheDocument();
      expect(screen.queryByText(/9\.6412/)).not.toBeInTheDocument();
      expect(screen.queryByText(/-13\.5784/)).not.toBeInTheDocument();
    });

    it("submits the vendor-location coordinates in the payload without further action", async () => {
      const user = userEvent.setup();
      createProductMock.mockResolvedValueOnce(makeProduct({ id: "p1" }));
      renderForm(makeUser({ lieuVente: { latitude: 9.6412, longitude: -13.5784 } }));

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
          latitude: 9.6412,
          longitude: -13.5784,
        }),
      );
    });

    it("shows no vendor-location message and behaves like T65 when user.lieuVente is null", async () => {
      renderForm(makeUser({ lieuVente: null }));

      await screen.findByRole("option", { name: "Mode & tissus" });

      expect(
        screen.queryByText(
          "✓ Position de ton lieu de vente — tu peux la retirer ou la remplacer pour ce produit.",
        ),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("✓ Position enregistrée")).not.toBeInTheDocument();
      expect(
        screen.getByText("Sans position, ton produit n'apparaîtra pas dans le tri par distance."),
      ).toBeInTheDocument();
    });
  });
});
