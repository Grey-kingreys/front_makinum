import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { formatPrixGNF } from "@/lib/format";
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

// T72b : avisProduit avec au moins un avis, dont un sans commentaire (pour
// vérifier l'absence de reviewBody dans ce cas).
const SAMPLE_PRODUCT_WITH_AVIS: ProductView = {
  ...SAMPLE_PRODUCT,
  avisProduit: {
    noteMoyenne: 4.3,
    nbAvis: 2,
    items: [
      {
        note: 5,
        commentaire: "Très bon produit, livraison rapide.",
        dateCreation: "2026-08-20T10:15:00.000Z",
        auteur: { nom: "Mariam Diallo" },
      },
      {
        note: 4,
        commentaire: null,
        dateCreation: "2026-08-10T00:00:00.000Z",
        auteur: { nom: "Ibrahima Sow" },
      },
    ],
  },
};

// T72b : forme renvoyée par le backend quand le produit n'a aucun avis —
// toujours présent mais vide (jamais aggregateRating/review vides côté JSON-LD).
const SAMPLE_PRODUCT_NO_AVIS: ProductView = {
  ...SAMPLE_PRODUCT,
  avisProduit: { noteMoyenne: null, nbAvis: 0, items: [] },
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

  it("includes aggregateRating and review in the JSON-LD when the product has avisProduit with reviews", async () => {
    getProductMock.mockResolvedValueOnce(SAMPLE_PRODUCT_WITH_AVIS);

    const ui = await ProduitPage({ params: Promise.resolve({ id: "p1" }) });
    const { container } = render(<GeoProvider>{ui}</GeoProvider>);

    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "{}");

    expect(data.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.3,
      reviewCount: 2,
      bestRating: 5,
      worstRating: 1,
    });
    expect(data.review).toEqual([
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Mariam Diallo" },
        datePublished: "2026-08-20",
        reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5, worstRating: 1 },
        reviewBody: "Très bon produit, livraison rapide.",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Ibrahima Sow" },
        datePublished: "2026-08-10",
        reviewRating: { "@type": "Rating", ratingValue: 4, bestRating: 5, worstRating: 1 },
      },
    ]);
    // Le deuxième avis n'a pas de commentaire : pas de clé reviewBody du tout.
    expect(data.review[1]).not.toHaveProperty("reviewBody");
  });

  it("omits aggregateRating and review when avisProduit has no reviews (nbAvis: 0)", async () => {
    getProductMock.mockResolvedValueOnce(SAMPLE_PRODUCT_NO_AVIS);

    const ui = await ProduitPage({ params: Promise.resolve({ id: "p1" }) });
    const { container } = render(<GeoProvider>{ui}</GeoProvider>);

    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "{}");

    expect(data.aggregateRating).toBeUndefined();
    expect(data.review).toBeUndefined();
  });

  it("omits aggregateRating and review without crashing when avisProduit is absent", async () => {
    getProductMock.mockResolvedValueOnce(SAMPLE_PRODUCT);

    const ui = await ProduitPage({ params: Promise.resolve({ id: "p1" }) });
    const { container } = render(<GeoProvider>{ui}</GeoProvider>);

    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "{}");

    expect(data.aggregateRating).toBeUndefined();
    expect(data.review).toBeUndefined();
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
    const prix = formatPrixGNF("185000");
    // `truncateDescription` normalise tous les espaces (y compris l'espace
    // fine insécable   que `formatPrixGNF` met entre les milliers) en
    // espace normal — contrairement au title, qui garde `prix` tel quel.
    const prixDansDescription = prix.replace(/\s/g, " ");

    expect(metadata.title).toBe(`Pagne wax 6 yards — ${prix} à Conakry`);
    expect(typeof metadata.description).toBe("string");
    expect(metadata.description as string).toMatch(
      new RegExp(`^Prix : ${prixDansDescription} à Conakry\\.`),
    );
    expect((metadata.description as string).length).toBeLessThanOrEqual(161);
    expect(metadata.alternates).toMatchObject({ canonical: "/produits/p1" });
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      title: `Pagne wax 6 yards — ${prix} à Conakry`,
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
