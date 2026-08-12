import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { VendorDetail as VendorDetailData } from "@/lib/vendors/types";

import VendeurPage, { generateMetadata } from "./page";

/**
 * `VendeurPage` est un Server Component async, même contrainte que
 * ProduitPage (../../produits/[id]/page.test.tsx) : on l'appelle et on
 * `await` sa promesse directement plutôt que de passer par `render()`.
 */

const { getVendorMock, notFoundMock, listVendeurReviewsMock } = vi.hoisted(() => ({
  getVendorMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  listVendeurReviewsMock: vi.fn(),
}));

vi.mock("@/lib/vendors/api", () => ({ getVendor: getVendorMock }));
vi.mock("next/navigation", () => ({ notFound: notFoundMock, usePathname: () => "/vendeurs/v1" }));
// VendeurDetail (rendu par VendeurPage) monte VendorReviewsSection, qui
// appelle GET /vendeurs/:id/avis — hors de portée de ce test (routage 404).
vi.mock("@/lib/reviews/api", () => ({ listVendeurReviews: listVendeurReviewsMock }));

const SAMPLE_VENDOR: VendorDetailData = {
  id: "v1",
  nom: "Fatoumata Bangoura",
  statutVendeur: "VERIFIE",
  noteMoyenne: 4.6,
  nbAvis: 23,
  nbProduitsActifs: 5,
  telephone: null,
  produits: [],
  avis: [],
};

const SAMPLE_VENDOR_NO_REVIEWS: VendorDetailData = {
  ...SAMPLE_VENDOR,
  noteMoyenne: null,
  nbAvis: 0,
};

describe("VendeurPage", () => {
  beforeEach(() => {
    getVendorMock.mockReset();
    notFoundMock.mockClear();
    listVendeurReviewsMock.mockReset();
    listVendeurReviewsMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 3,
      resume: { noteMoyenne: null, nbAvis: 0 },
    });
  });

  it("renders the vendor detail when getVendor resolves", async () => {
    getVendorMock.mockResolvedValueOnce(SAMPLE_VENDOR);

    const ui = await VendeurPage({ params: Promise.resolve({ id: "v1" }) });
    render(ui);

    expect(screen.getByRole("heading", { name: "Fatoumata Bangoura" })).toBeInTheDocument();
    expect(getVendorMock).toHaveBeenCalledWith("v1");
  });

  it("calls notFound() when getVendor rejects with a 404 ApiError", async () => {
    getVendorMock.mockRejectedValueOnce(
      new ApiError(404, "Vendeur introuvable", "VENDOR_NOT_FOUND"),
    );

    await expect(VendeurPage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("re-throws non-404 errors instead of calling notFound()", async () => {
    getVendorMock.mockRejectedValueOnce(new ApiError(500, "Erreur serveur"));

    await expect(VendeurPage({ params: Promise.resolve({ id: "v1" }) })).rejects.toThrow(
      "Erreur serveur",
    );
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("renders a JSON-LD Store script with aggregateRating when the vendor has reviews", async () => {
    getVendorMock.mockResolvedValueOnce(SAMPLE_VENDOR);

    const ui = await VendeurPage({ params: Promise.resolve({ id: "v1" }) });
    const { container } = render(ui);

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script?.textContent ?? "{}");

    expect(data["@type"]).toBe("Store");
    expect(data.name).toBe("Fatoumata Bangoura");
    expect(data.aggregateRating).toMatchObject({
      "@type": "AggregateRating",
      ratingValue: 4.6,
      reviewCount: 23,
    });
  });

  it("omits aggregateRating entirely when the vendor has no review", async () => {
    getVendorMock.mockResolvedValueOnce(SAMPLE_VENDOR_NO_REVIEWS);

    const ui = await VendeurPage({ params: Promise.resolve({ id: "v1" }) });
    const { container } = render(ui);

    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "{}");

    expect(data.aggregateRating).toBeUndefined();
  });
});

describe("generateMetadata (VendeurPage)", () => {
  beforeEach(() => {
    getVendorMock.mockReset();
  });

  it("uses the vendor name, a description mentioning activity and review count, and the canonical URL", async () => {
    getVendorMock.mockResolvedValueOnce(SAMPLE_VENDOR);

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "v1" }) });

    expect(metadata.title).toBe("Fatoumata Bangoura");
    expect(metadata.description).toContain("5 produits actifs");
    expect(metadata.description).toContain("4.6/5");
    expect(metadata.alternates).toMatchObject({ canonical: "/vendeurs/v1" });
    expect(metadata.openGraph).toMatchObject({ type: "website", title: "Fatoumata Bangoura" });
  });

  it("describes activity without a rating when the vendor has no review", async () => {
    getVendorMock.mockResolvedValueOnce(SAMPLE_VENDOR_NO_REVIEWS);

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "v1" }) });

    expect(metadata.description).not.toContain("noté");
  });

  it("returns fallback metadata instead of throwing when the vendor is a 404", async () => {
    getVendorMock.mockRejectedValueOnce(new ApiError(404, "Vendeur introuvable", "VENDOR_NOT_FOUND"));

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "missing" }) });

    expect(metadata.title).toBe("Vendeur introuvable");
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("re-throws non-404 errors", async () => {
    getVendorMock.mockRejectedValueOnce(new ApiError(500, "Erreur serveur"));

    await expect(generateMetadata({ params: Promise.resolve({ id: "v1" }) })).rejects.toThrow(
      "Erreur serveur",
    );
  });
});
