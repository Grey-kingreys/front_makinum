import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { DemandesProvider } from "@/lib/purchase-requests";
import type { PurchaseRequestView } from "@/lib/purchase-requests/types";

import { DemandeCard } from "./DemandeCard";

const { createReviewMock, listPurchaseRequestsMock } = vi.hoisted(() => ({
  createReviewMock: vi.fn(),
  listPurchaseRequestsMock: vi.fn(),
}));

vi.mock("@/lib/reviews/api", () => ({ createReview: createReviewMock }));
vi.mock("@/lib/purchase-requests/api", () => ({
  listPurchaseRequests: listPurchaseRequestsMock,
  addPurchaseRequestItem: vi.fn(),
  removePurchaseRequestItem: vi.fn(),
  sendPurchaseRequest: vi.fn(),
  cancelPurchaseRequest: vi.fn(),
  createOrCompletePurchaseRequest: vi.fn(),
  getPurchaseRequest: vi.fn(),
}));

function makeDemande(overrides: Partial<PurchaseRequestView> = {}): PurchaseRequestView {
  return {
    id: "d1",
    statut: "CLOTUREE",
    resultat: "ABOUTIE",
    acheteurId: "u1",
    vendeurId: "v1",
    dateCreation: "2026-08-01T00:00:00.000Z",
    dateMiseAJour: "2026-08-01T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        produitId: "p1",
        quantite: 1,
        produit: { id: "p1", titre: "Sac en raphia", prix: "150000", miniature: null },
      },
    ],
    interlocuteur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "VERIFIE" },
    ...overrides,
  };
}

function renderCard(demande: PurchaseRequestView) {
  return render(
    <DemandesProvider>
      <DemandeCard demande={demande} />
    </DemandesProvider>,
  );
}

describe("DemandeCard — avis (demande CLOTUREE)", () => {
  beforeEach(() => {
    createReviewMock.mockReset();
    listPurchaseRequestsMock.mockReset();
    listPurchaseRequestsMock.mockResolvedValue([]);
  });

  it("submits { purchaseRequestId, note, commentaire } and shows « Avis envoyé ★N » on success", async () => {
    const user = userEvent.setup();
    createReviewMock.mockResolvedValueOnce({
      id: "r1",
      purchaseRequestId: "d1",
      vendeurId: "v1",
      produitId: "p1",
      note: 5,
      commentaire: "Impeccable",
      dateCreation: "2026-08-04T00:00:00.000Z",
      auteur: { nom: "Moi" },
      produit: { titre: "Sac en raphia" },
    });
    renderCard(makeDemande());

    await user.click(screen.getByRole("button", { name: "Laisser un avis" }));
    await user.click(screen.getByRole("radio", { name: "5 étoiles" }));
    await user.type(screen.getByLabelText("Commentaire (optionnel)"), "Impeccable");
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    await waitFor(() =>
      expect(createReviewMock).toHaveBeenCalledWith({
        purchaseRequestId: "d1",
        note: 5,
        commentaire: "Impeccable",
      }),
    );
    expect(await screen.findByText("Avis envoyé ★5")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Laisser un avis" })).not.toBeInTheDocument();
  });

  it("hides the button and shows a mention when REVIEW_ALREADY_EXISTS is returned", async () => {
    const user = userEvent.setup();
    createReviewMock.mockRejectedValueOnce(
      new ApiError(409, "Un avis a déjà été déposé pour cette demande", "REVIEW_ALREADY_EXISTS"),
    );
    renderCard(makeDemande());

    await user.click(screen.getByRole("button", { name: "Laisser un avis" }));
    await user.click(screen.getByRole("radio", { name: "4 étoiles" }));
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    expect(await screen.findByText("Tu as déjà laissé un avis pour cette demande.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Laisser un avis" })).not.toBeInTheDocument();
    expect(screen.queryByText("Comment s'est passé l'échange ?")).not.toBeInTheDocument();
  });

  it("shows a REQUEST_NOT_CLOSED message without hiding the form", async () => {
    const user = userEvent.setup();
    createReviewMock.mockRejectedValueOnce(
      new ApiError(409, "Demande non clôturée", "REQUEST_NOT_CLOSED"),
    );
    renderCard(makeDemande());

    await user.click(screen.getByRole("button", { name: "Laisser un avis" }));
    await user.click(screen.getByRole("radio", { name: "3 étoiles" }));
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    expect(await screen.findByText(/n'est pas encore clôturée/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publier mon avis" })).toBeInTheDocument();
  });

  it("does not render the review action on a non-closed demande", () => {
    renderCard(makeDemande({ statut: "ENVOYEE", resultat: null }));
    expect(screen.queryByRole("button", { name: "Laisser un avis" })).not.toBeInTheDocument();
  });
});
