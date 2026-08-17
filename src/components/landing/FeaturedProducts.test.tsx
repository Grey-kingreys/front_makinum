import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductSearchItem, ProductSearchResult } from "@/lib/products/types";

import { FeaturedProducts } from "./FeaturedProducts";

const { searchProductsCachedMock } = vi.hoisted(() => ({
  searchProductsCachedMock: vi.fn(),
}));

vi.mock("@/lib/products/api", () => ({
  searchProductsCached: searchProductsCachedMock,
}));

const PRODUCT: ProductSearchItem = {
  id: "p1",
  titre: "Pagne wax 6 yards",
  prix: "185000",
  latitude: 9.6412,
  longitude: -13.5784,
  distanceKm: null,
  miniature: null,
  categorie: { nom: "Mode & tissus", slug: "mode-tissus" },
  vendeur: {
    id: "v1",
    nom: "Fatoumata Diallo",
    statutVendeur: "VERIFIE",
    noteMoyenne: null,
    nbAvis: 0,
  },
};

function makeResult(items: ProductSearchItem[]): ProductSearchResult {
  return { items, total: items.length, page: 1, limit: 8 };
}

// FeaturedProducts est un composant serveur async : React Testing Library ne
// sait pas l'attendre tout seul (pas de pipeline RSC en test), on résout
// donc la promesse nous-mêmes avant de passer l'élément à `render` — même
// motif que CategoryGrid.test.tsx.
async function renderFeaturedProducts() {
  const element = await FeaturedProducts();
  if (element === null) return null;
  render(element);
  return element;
}

describe("FeaturedProducts", () => {
  beforeEach(() => {
    searchProductsCachedMock.mockReset();
  });

  it("affiche les produits renvoyés par GET /products?limit=8", async () => {
    searchProductsCachedMock.mockResolvedValueOnce(makeResult([PRODUCT]));

    await renderFeaturedProducts();

    expect(searchProductsCachedMock).toHaveBeenCalledWith({ limit: 8 });
    expect(screen.getByText("Pagne wax 6 yards")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir tous les produits" })).toHaveAttribute(
      "href",
      "/produits",
    );
  });

  it("masque la section entière quand l'appel API échoue", async () => {
    searchProductsCachedMock.mockRejectedValueOnce(new Error("network down"));

    const element = await renderFeaturedProducts();

    expect(element).toBeNull();
    expect(screen.queryByText("Pagne wax 6 yards")).not.toBeInTheDocument();
  });

  it("masque la section entière quand l'API renvoie une liste vide", async () => {
    searchProductsCachedMock.mockResolvedValueOnce(makeResult([]));

    const element = await renderFeaturedProducts();

    expect(element).toBeNull();
    expect(screen.queryByRole("link", { name: "Voir tous les produits" })).not.toBeInTheDocument();
  });

  it("n'affiche jamais la mention de localisation sur la landing (showDistance=false)", async () => {
    searchProductsCachedMock.mockResolvedValueOnce(makeResult([PRODUCT]));

    await renderFeaturedProducts();

    expect(screen.queryByText("Localisation non précisée")).not.toBeInTheDocument();
    expect(screen.queryByText(/km/)).not.toBeInTheDocument();
  });
});
