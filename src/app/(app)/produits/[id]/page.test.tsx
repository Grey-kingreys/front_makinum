import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { GeoProvider } from "@/lib/geo";
import type { ProductView } from "@/lib/products/types";

import ProduitPage, { generateMetadata } from "./page";

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
vi.mock("next/navigation", () => ({ notFound: notFoundMock, usePathname: () => "/produits/p1" }));

// ProductDetail (rendu par ProduitPage) appelle useAuth() et useDemandes()
// (T16, bouton « Ajouter à ma demande ») — hors de portée de ce test (qui ne
// couvre que le routage 404 de la page), donc mockés en dur plutôt que de
// monter AuthProvider/DemandesProvider ici.
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    useAuth: () => ({ user: null, loading: false, login: vi.fn(), logout: vi.fn(), refresh: vi.fn() }),
  };
});
vi.mock("@/lib/purchase-requests", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/purchase-requests")>("@/lib/purchase-requests");
  return {
    ...actual,
    useDemandes: () => ({ demandes: [], loading: false, error: null, draftCount: 0, refresh: vi.fn() }),
  };
});

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

const SAMPLE_PRODUCT_WITH_PHOTO: ProductView = {
  ...SAMPLE_PRODUCT,
  photos: [
    { id: "ph1", url: "https://api.makinum.example/photos/ph1.jpg", urlMiniature: "https://api.makinum.example/photos/ph1-thumb.jpg", ordre: 0 },
  ],
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

  it("renders a JSON-LD Product script alongside the product detail", async () => {
    getProductMock.mockResolvedValueOnce(SAMPLE_PRODUCT_WITH_PHOTO);

    const ui = await ProduitPage({ params: Promise.resolve({ id: "p1" }) });
    const { container } = render(<GeoProvider>{ui}</GeoProvider>);

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script?.textContent ?? "{}");

    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe("Pagne wax 6 yards");
    expect(data.image).toEqual(["https://api.makinum.example/photos/ph1.jpg"]);
    expect(data.offers).toMatchObject({ "@type": "Offer", price: "185000", priceCurrency: "GNF" });
    expect(data.seller).toMatchObject({ name: "Fatoumata Bangoura" });
  });

  it("omits the JSON-LD image field when the product has no photo", async () => {
    getProductMock.mockResolvedValueOnce(SAMPLE_PRODUCT);

    const ui = await ProduitPage({ params: Promise.resolve({ id: "p1" }) });
    const { container } = render(<GeoProvider>{ui}</GeoProvider>);

    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "{}");

    expect(data.image).toBeUndefined();
  });
});

describe("generateMetadata (ProduitPage)", () => {
  beforeEach(() => {
    getProductMock.mockReset();
  });

  it("uses the product title, a truncated description, the canonical URL and the OG image", async () => {
    const longDescription =
      "Ce pagne wax est importé directement de Hollande, tissé avec des motifs traditionnels " +
      "guinéens, disponible en plusieurs coloris et livré partout à Conakry sous 48 heures ouvrées.";
    getProductMock.mockResolvedValueOnce({
      ...SAMPLE_PRODUCT_WITH_PHOTO,
      description: longDescription,
    });

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "p1" }) });

    expect(metadata.title).toBe("Pagne wax 6 yards");
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeLessThanOrEqual(161);
    expect(metadata.alternates).toMatchObject({ canonical: "/produits/p1" });
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      title: "Pagne wax 6 yards",
      url: "/produits/p1",
    });
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: "https://api.makinum.example/photos/ph1.jpg" }),
    ]);
  });

  it("falls back to the default site image when the product has no photo", async () => {
    getProductMock.mockResolvedValueOnce(SAMPLE_PRODUCT);

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "p1" }) });

    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: "/icons/icon-512.png" }),
    ]);
  });

  it("returns fallback metadata instead of throwing when the product is a 404", async () => {
    getProductMock.mockRejectedValueOnce(new ApiError(404, "Produit introuvable", "PRODUCT_NOT_FOUND"));

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "missing" }) });

    expect(metadata.title).toBe("Produit introuvable");
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("re-throws non-404 errors", async () => {
    getProductMock.mockRejectedValueOnce(new ApiError(500, "Erreur serveur"));

    await expect(generateMetadata({ params: Promise.resolve({ id: "p1" }) })).rejects.toThrow(
      "Erreur serveur",
    );
  });
});
