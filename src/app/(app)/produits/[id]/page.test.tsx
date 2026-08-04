import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { GeoProvider } from "@/lib/geo";
import type { ProductView } from "@/lib/products/types";

import ProduitPage from "./page";

/**
 * `ProduitPage` est un Server Component async : Vitest/RTL ne peut pas le
 * `render()` directement (cf. node_modules/next/dist/docs/.../testing/vitest.md,
 * « Vitest currently does not support async Server Components »). C'est
 * néanmoins une fonction JS ordinaire — on l'appelle et on `await` sa
 * promesse directement, puis on rend l'élément React déjà résolu.
 */

const { getProductMock, notFoundMock } = vi.hoisted(() => ({
  getProductMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/products/api", () => ({ getProduct: getProductMock }));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

const SAMPLE_PRODUCT: ProductView = {
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
};

describe("ProduitPage", () => {
  beforeEach(() => {
    getProductMock.mockReset();
    notFoundMock.mockClear();
  });

  it("renders the product detail when getProduct resolves", async () => {
    getProductMock.mockResolvedValueOnce(SAMPLE_PRODUCT);

    const ui = await ProduitPage({ params: Promise.resolve({ id: "p1" }) });
    render(<GeoProvider>{ui}</GeoProvider>);

    expect(screen.getByRole("heading", { name: "Pagne wax 6 yards" })).toBeInTheDocument();
    expect(getProductMock).toHaveBeenCalledWith("p1");
  });

  it("calls notFound() when getProduct rejects with a 404 ApiError", async () => {
    getProductMock.mockRejectedValueOnce(new ApiError(404, "Produit introuvable", "PRODUCT_NOT_FOUND"));

    await expect(ProduitPage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("re-throws non-404 errors instead of calling notFound()", async () => {
    getProductMock.mockRejectedValueOnce(new ApiError(500, "Erreur serveur"));

    await expect(ProduitPage({ params: Promise.resolve({ id: "p1" }) })).rejects.toThrow(
      "Erreur serveur",
    );
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
