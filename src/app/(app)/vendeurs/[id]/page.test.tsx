import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { VendorDetail as VendorDetailData } from "@/lib/vendors/types";

import VendeurPage from "./page";

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
  nbProduitsActifs: 0,
  telephone: null,
  produits: [],
  avis: [],
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
});
