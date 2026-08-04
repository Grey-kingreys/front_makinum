import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { VendeurReviewItem } from "@/lib/reviews/types";

import { VendorReviewsSection } from "./VendorReviewsSection";

const { listVendeurReviewsMock } = vi.hoisted(() => ({ listVendeurReviewsMock: vi.fn() }));

vi.mock("@/lib/reviews/api", () => ({ listVendeurReviews: listVendeurReviewsMock }));

function makeReview(overrides: Partial<VendeurReviewItem> = {}): VendeurReviewItem {
  return {
    note: 5,
    commentaire: "Rendez-vous respecté, tissu conforme.",
    dateCreation: "2026-08-01T00:00:00.000Z",
    auteur: { nom: "Mariama C." },
    produit: { titre: "Pagne wax" },
    ...overrides,
  };
}

describe("VendorReviewsSection", () => {
  beforeEach(() => {
    listVendeurReviewsMock.mockReset();
  });

  it("fetches the first page (limit 3) on mount and renders the reviews", async () => {
    listVendeurReviewsMock.mockResolvedValueOnce({
      items: [makeReview({ auteur: { nom: "Mariama C." } }), makeReview({ auteur: { nom: "Thierno D." } })],
      total: 2,
      page: 1,
      limit: 3,
      resume: { noteMoyenne: 4.6, nbAvis: 2 },
    });

    render(<VendorReviewsSection vendeurId="v1" />);

    expect(await screen.findByText("Mariama C.")).toBeInTheDocument();
    expect(screen.getByText("Thierno D.")).toBeInTheDocument();
    expect(listVendeurReviewsMock).toHaveBeenCalledWith("v1", { page: 1, limit: 3 });
    // No « Voir plus » once every review is loaded (total === items.length).
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
  });

  it("shows an empty state when the vendor has no reviews", async () => {
    listVendeurReviewsMock.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 3,
      resume: { noteMoyenne: null, nbAvis: 0 },
    });

    render(<VendorReviewsSection vendeurId="v1" />);

    expect(await screen.findByText("Ce vendeur n'a pas encore reçu d'avis.")).toBeInTheDocument();
  });

  it("« Voir plus » loads and appends the next page", async () => {
    const user = userEvent.setup();
    listVendeurReviewsMock.mockResolvedValueOnce({
      items: [makeReview({ auteur: { nom: "Mariama C." } })],
      total: 4,
      page: 1,
      limit: 3,
      resume: { noteMoyenne: 4.5, nbAvis: 4 },
    });
    listVendeurReviewsMock.mockResolvedValueOnce({
      items: [makeReview({ auteur: { nom: "Ibrahima K." } })],
      total: 4,
      page: 2,
      limit: 3,
      resume: { noteMoyenne: 4.5, nbAvis: 4 },
    });

    render(<VendorReviewsSection vendeurId="v1" />);
    await screen.findByText("Mariama C.");

    await user.click(screen.getByRole("button", { name: "Voir plus" }));

    await waitFor(() =>
      expect(listVendeurReviewsMock).toHaveBeenCalledWith("v1", { page: 2, limit: 3 }),
    );
    expect(await screen.findByText("Ibrahima K.")).toBeInTheDocument();
    // Both pages stay visible — additive pagination.
    expect(screen.getByText("Mariama C.")).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    listVendeurReviewsMock.mockRejectedValueOnce(new ApiError(404, "Vendeur introuvable", "VENDOR_NOT_FOUND"));

    render(<VendorReviewsSection vendeurId="v1" />);

    expect(await screen.findByText("Ce vendeur est introuvable.")).toBeInTheDocument();
  });
});
