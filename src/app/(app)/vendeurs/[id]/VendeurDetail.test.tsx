import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VendorDetail as VendorDetailData } from "@/lib/vendors/types";

import { VendeurDetail } from "./VendeurDetail";

const { listVendeurReviewsMock } = vi.hoisted(() => ({
  listVendeurReviewsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/vendeurs/v1" }));

vi.mock("@/lib/reviews/api", () => ({ listVendeurReviews: listVendeurReviewsMock }));

function makeVendor(overrides: Partial<VendorDetailData> = {}): VendorDetailData {
  return {
    id: "v1",
    nom: "Fatoumata Bangoura",
    statutVendeur: "VERIFIE",
    noteMoyenne: 4.6,
    nbAvis: 23,
    nbProduitsActifs: 1,
    telephone: null,
    produits: [
      {
        id: "p1",
        titre: "Pagne wax 6 yards",
        prix: "185000",
        latitude: null,
        longitude: null,
        distanceKm: null,
        miniature: null,
        categorie: { nom: "Mode & tissus", slug: "mode-tissus" },
        vendeur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "VERIFIE", noteMoyenne: 4.6, nbAvis: 23 },
      },
    ],
    avis: [],
    ...overrides,
  };
}

describe("VendeurDetail", () => {
  beforeEach(() => {
    listVendeurReviewsMock.mockReset();
    listVendeurReviewsMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 3,
      resume: { noteMoyenne: null, nbAvis: 0 },
    });
  });

  it("renders vendor identity: name, badge, average rating and review count", () => {
    render(<VendeurDetail vendor={makeVendor()} />);

    const heading = screen.getByRole("heading", { name: "Fatoumata Bangoura" });
    expect(heading).toBeInTheDocument();
    // Scoped to the identity header — the vendor's own product card below
    // also renders a VendeurBadge ("vérifié") in this fixture.
    expect(within(heading.parentElement as HTMLElement).getByText("vérifié")).toBeInTheDocument();
    expect(screen.getByText("★ 4.6 (23 avis)")).toBeInTheDocument();
  });

  it("renders the vendor's active products with ProductCard", () => {
    render(<VendeurDetail vendor={makeVendor()} />);

    const link = screen.getByRole("link", { name: /Pagne wax 6 yards/ });
    expect(link).toHaveAttribute("href", "/produits/p1");
  });

  it("shows an empty message when the vendor has no active products", () => {
    render(<VendeurDetail vendor={makeVendor({ produits: [] })} />);

    expect(
      screen.getByText("Ce vendeur n'a pas de produit actif pour l'instant."),
    ).toBeInTheDocument();
  });

  it("loads and renders the vendor's reviews section", async () => {
    listVendeurReviewsMock.mockResolvedValueOnce({
      items: [
        {
          note: 5,
          commentaire: "Rendez-vous respecté à Madina.",
          dateCreation: "2026-08-01T00:00:00.000Z",
          auteur: { nom: "Mariama C." },
          produit: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 3,
      resume: { noteMoyenne: 5, nbAvis: 1 },
    });
    render(<VendeurDetail vendor={makeVendor()} />);

    expect(await screen.findByText("Avis sur ce vendeur")).toBeInTheDocument();
    expect(await screen.findByText("Mariama C.")).toBeInTheDocument();
    expect(listVendeurReviewsMock).toHaveBeenCalledWith("v1", { page: 1, limit: 3 });
  });

  describe("bloc contact", () => {
    it("hides the contact buttons and shows a login invitation (with returnTo, T51) when telephone is null", () => {
      render(<VendeurDetail vendor={makeVendor({ telephone: null })} />);

      expect(screen.queryByRole("link", { name: "Appeler" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "WhatsApp" })).not.toBeInTheDocument();

      const loginLink = screen.getByRole("link", { name: "Connecte-toi" });
      expect(loginLink).toHaveAttribute("href", "/connexion?returnTo=%2Fvendeurs%2Fv1");
      expect(screen.getByText(/pour voir les coordonnées de ce vendeur/)).toBeInTheDocument();
    });

    it("shows tel: and wa.me contact buttons when telephone is present", () => {
      render(<VendeurDetail vendor={makeVendor({ telephone: "+224622000000" })} />);

      expect(screen.getByRole("link", { name: "Appeler" })).toHaveAttribute(
        "href",
        "tel:+224622000000",
      );
      expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
        "href",
        "https://wa.me/224622000000",
      );
      expect(screen.queryByRole("link", { name: "Connecte-toi" })).not.toBeInTheDocument();
    });
  });
});
