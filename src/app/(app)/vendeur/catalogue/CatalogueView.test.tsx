import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PublicUser } from "@/lib/auth/types";
import type { ProductView } from "@/lib/products/types";

import { CatalogueView } from "./CatalogueView";

const { getMyProductsMock, updateProductMock, deleteProductMock, useAuthMock } = vi.hoisted(() => ({
  getMyProductsMock: vi.fn(),
  updateProductMock: vi.fn(),
  deleteProductMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("@/lib/products/vendor-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/products/vendor-api")>("@/lib/products/vendor-api");
  return {
    ...actual,
    getMyProducts: getMyProductsMock,
    updateProduct: updateProductMock,
    deleteProduct: deleteProductMock,
  };
});

vi.mock("@/lib/auth", () => ({ useAuth: useAuthMock }));

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
    ...overrides,
  };
}

function makeProduct(overrides: Partial<ProductView> = {}): ProductView {
  return {
    id: "p1",
    titre: "Pagne wax 6 yards",
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

describe("CatalogueView", () => {
  beforeEach(() => {
    getMyProductsMock.mockReset();
    updateProductMock.mockReset();
    deleteProductMock.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      user: makeUser(),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it("shows the empty state with a CTA when the vendor has no product yet", async () => {
    getMyProductsMock.mockResolvedValueOnce([]);
    render(<CatalogueView />);

    expect(await screen.findByText("Tu n'as encore publié aucun produit.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Publier mon premier produit" })).toHaveAttribute(
      "href",
      "/vendeur/produits/nouveau",
    );
  });

  it("renders the active-products gauge and marks inactive products with a « Désactivé » badge", async () => {
    getMyProductsMock.mockResolvedValueOnce([
      makeProduct({ id: "p1", titre: "Produit actif", actif: true }),
      makeProduct({ id: "p2", titre: "Produit inactif", actif: false }),
    ]);
    render(<CatalogueView />);

    await screen.findByText("Produit actif");
    expect(screen.getByText("Produit inactif")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText("Désactivé")).toBeInTheDocument();
  });

  it("shows a near-limit warning once active products reach the alert threshold (28/30)", async () => {
    const products = Array.from({ length: 28 }, (_, index) =>
      makeProduct({ id: `p${index}`, titre: `Produit ${index}`, actif: true }),
    );
    getMyProductsMock.mockResolvedValueOnce(products);
    render(<CatalogueView />);

    await waitFor(() => expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "28"));
    expect(screen.getByText(/Tu approches la limite de 30 produits actifs/)).toBeInTheDocument();
  });

  it("deactivates an active product via the toggle button", async () => {
    const user = userEvent.setup();
    getMyProductsMock.mockResolvedValueOnce([makeProduct({ id: "p1", actif: true })]);
    updateProductMock.mockResolvedValueOnce(makeProduct({ id: "p1", actif: false }));
    render(<CatalogueView />);

    await screen.findByText("Pagne wax 6 yards");
    await user.click(screen.getByRole("button", { name: "Désactiver" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledWith("p1", { actif: false }));
    expect(await screen.findByText("Désactivé")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réactiver" })).toBeInTheDocument();
  });

  it("shows a clear message when reactivating hits PRODUCT_LIMIT_REACHED", async () => {
    const user = userEvent.setup();
    getMyProductsMock.mockResolvedValueOnce([makeProduct({ id: "p1", actif: false })]);
    updateProductMock.mockRejectedValueOnce(
      new ApiError(409, "Limite de 30 produits actifs atteinte", "PRODUCT_LIMIT_REACHED"),
    );
    render(<CatalogueView />);

    await screen.findByText("Pagne wax 6 yards");
    await user.click(screen.getByRole("button", { name: "Réactiver" }));

    expect(
      await screen.findByText(/désactive un autre produit avant de réactiver celui-ci/),
    ).toBeInTheDocument();
    // Toggle stays "Réactiver" — the product remained inactive server-side.
    expect(screen.getByRole("button", { name: "Réactiver" })).toBeInTheDocument();
  });

  it("shows an error banner with retry when the catalogue fails to load", async () => {
    const user = userEvent.setup();
    getMyProductsMock.mockRejectedValueOnce(new ApiError(500, "Erreur serveur"));
    getMyProductsMock.mockResolvedValueOnce([makeProduct({ id: "p1" })]);
    render(<CatalogueView />);

    expect(await screen.findByText("Erreur serveur")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByText("Pagne wax 6 yards")).toBeInTheDocument();
  });

  it("disables « Publier un produit » with an explanation for an unvalidated vendor", async () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ vendeurValide: false }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    getMyProductsMock.mockResolvedValueOnce([makeProduct({ id: "p1" })]);
    render(<CatalogueView />);

    await screen.findByText("Pagne wax 6 yards");

    expect(screen.queryByRole("link", { name: "Publier un produit" })).not.toBeInTheDocument();
    const disabledCta = screen.getByText("Publier un produit");
    expect(disabledCta).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText(/compte vendeur doit être validé par un administrateur/),
    ).toBeInTheDocument();
  });

  it("keeps « Publier un produit » as an active link for a validated vendor", async () => {
    getMyProductsMock.mockResolvedValueOnce([makeProduct({ id: "p1" })]);
    render(<CatalogueView />);

    await screen.findByText("Pagne wax 6 yards");

    expect(screen.getByRole("link", { name: "Publier un produit" })).toHaveAttribute(
      "href",
      "/vendeur/produits/nouveau",
    );
  });

  it("disables « Publier mon premier produit » in the empty state for an unvalidated vendor", async () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ vendeurValide: false }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    getMyProductsMock.mockResolvedValueOnce([]);
    render(<CatalogueView />);

    await screen.findByText("Tu n'as encore publié aucun produit.");

    expect(
      screen.queryByRole("link", { name: "Publier mon premier produit" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Publier mon premier produit")).toHaveAttribute("aria-disabled", "true");
  });

  it("clicking « Supprimer » opens the confirm dialog without calling the API", async () => {
    const user = userEvent.setup();
    getMyProductsMock.mockResolvedValueOnce([makeProduct({ id: "p1" })]);
    render(<CatalogueView />);

    await screen.findByText("Pagne wax 6 yards");
    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/irréversible/)).toBeInTheDocument();
    expect(deleteProductMock).not.toHaveBeenCalled();
  });

  it("cancelling the confirm dialog makes no API call", async () => {
    const user = userEvent.setup();
    getMyProductsMock.mockResolvedValueOnce([makeProduct({ id: "p1" })]);
    render(<CatalogueView />);

    await screen.findByText("Pagne wax 6 yards");
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteProductMock).not.toHaveBeenCalled();
    expect(screen.getByText("Pagne wax 6 yards")).toBeInTheDocument();
  });

  it("confirming calls deleteProduct once and refreshes the list", async () => {
    const user = userEvent.setup();
    getMyProductsMock.mockResolvedValueOnce([makeProduct({ id: "p1" })]);
    deleteProductMock.mockResolvedValueOnce(undefined);
    render(<CatalogueView />);

    await screen.findByText("Pagne wax 6 yards");
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await screen.findByRole("dialog");
    // Deux boutons « Supprimer » à ce stade (carte + dialogue) : celui du
    // dialogue est le dernier rendu.
    const confirmButtons = screen.getAllByRole("button", { name: "Supprimer" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(deleteProductMock).toHaveBeenCalledTimes(1));
    expect(deleteProductMock).toHaveBeenCalledWith("p1");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText("Pagne wax 6 yards")).not.toBeInTheDocument();
  });

  it("shows a message pointing to deactivation on PRODUCT_HAS_HISTORY, keeps the product listed", async () => {
    const user = userEvent.setup();
    getMyProductsMock.mockResolvedValueOnce([makeProduct({ id: "p1" })]);
    deleteProductMock.mockRejectedValueOnce(
      new ApiError(
        409,
        "Ce produit a un historique (demandes, avis ou signalements) : désactivez-le plutôt que de le supprimer",
        "PRODUCT_HAS_HISTORY",
      ),
    );
    render(<CatalogueView />);

    await screen.findByText("Pagne wax 6 yards");
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await screen.findByRole("dialog");
    const confirmButtons = screen.getAllByRole("button", { name: "Supprimer" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(
      await screen.findByText(/désactive-le plutôt que de le supprimer/),
    ).toBeInTheDocument();
    expect(screen.getByText("Pagne wax 6 yards")).toBeInTheDocument();
  });

  it("recalculates the active-products gauge after deleting an active product", async () => {
    const user = userEvent.setup();
    getMyProductsMock.mockResolvedValueOnce([
      makeProduct({ id: "p1", titre: "Produit un", actif: true }),
      makeProduct({ id: "p2", titre: "Produit deux", actif: true }),
    ]);
    deleteProductMock.mockResolvedValueOnce(undefined);
    render(<CatalogueView />);

    await screen.findByText("Produit un");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");

    const [deleteButtonProduitUn] = screen.getAllByRole("button", { name: "Supprimer" });
    await user.click(deleteButtonProduitUn);
    await screen.findByRole("dialog");
    const confirmButtons = screen.getAllByRole("button", { name: "Supprimer" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1"));
    expect(screen.queryByText("Produit un")).not.toBeInTheDocument();
    expect(screen.getByText("Produit deux")).toBeInTheDocument();
  });
});
