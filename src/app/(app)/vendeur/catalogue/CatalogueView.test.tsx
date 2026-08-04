import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { ProductView } from "@/lib/products/types";

import { CatalogueView } from "./CatalogueView";

const { getMyProductsMock, updateProductMock } = vi.hoisted(() => ({
  getMyProductsMock: vi.fn(),
  updateProductMock: vi.fn(),
}));

vi.mock("@/lib/products/vendor-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/products/vendor-api")>("@/lib/products/vendor-api");
  return {
    ...actual,
    getMyProducts: getMyProductsMock,
    updateProduct: updateProductMock,
  };
});

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
});
