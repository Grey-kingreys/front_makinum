import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DemandesProvider } from "@/lib/purchase-requests";
import type { PurchaseRequestView } from "@/lib/purchase-requests/types";

import { DemandesView } from "./DemandesView";

const {
  listPurchaseRequestsMock,
  addPurchaseRequestItemMock,
  removePurchaseRequestItemMock,
  sendPurchaseRequestMock,
  cancelPurchaseRequestMock,
} = vi.hoisted(() => ({
  listPurchaseRequestsMock: vi.fn(),
  addPurchaseRequestItemMock: vi.fn(),
  removePurchaseRequestItemMock: vi.fn(),
  sendPurchaseRequestMock: vi.fn(),
  cancelPurchaseRequestMock: vi.fn(),
}));

vi.mock("@/lib/purchase-requests/api", () => ({
  listPurchaseRequests: listPurchaseRequestsMock,
  addPurchaseRequestItem: addPurchaseRequestItemMock,
  removePurchaseRequestItem: removePurchaseRequestItemMock,
  sendPurchaseRequest: sendPurchaseRequestMock,
  cancelPurchaseRequest: cancelPurchaseRequestMock,
  createOrCompletePurchaseRequest: vi.fn(),
  getPurchaseRequest: vi.fn(),
}));

function makeDemande(overrides: Partial<PurchaseRequestView> = {}): PurchaseRequestView {
  return {
    id: "d1",
    statut: "EN_COURS",
    resultat: null,
    acheteurId: "moi",
    vendeurId: "v1",
    dateCreation: "2026-08-01T00:00:00.000Z",
    dateMiseAJour: "2026-08-01T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        produitId: "p1",
        quantite: 2,
        produit: { id: "p1", titre: "Sac en raphia", prix: "150000", miniature: null },
      },
    ],
    interlocuteur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "VERIFIE" },
    ...overrides,
  };
}

function renderView() {
  return render(
    <DemandesProvider>
      <DemandesView />
    </DemandesProvider>,
  );
}

describe("DemandesView", () => {
  beforeEach(() => {
    listPurchaseRequestsMock.mockReset();
    addPurchaseRequestItemMock.mockReset();
    removePurchaseRequestItemMock.mockReset();
    sendPurchaseRequestMock.mockReset();
    cancelPurchaseRequestMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the empty state with a CTA to /produits when there is no demande", async () => {
    listPurchaseRequestsMock.mockResolvedValueOnce([]);
    renderView();

    expect(await screen.findByText("Tu n'as pas encore de demande d'achat.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorer les produits" })).toHaveAttribute(
      "href",
      "/produits",
    );
  });

  it("groups demandes by statut (Brouillons / Envoyées / Clôturées)", async () => {
    listPurchaseRequestsMock.mockResolvedValueOnce([
      makeDemande({ id: "d1", statut: "EN_COURS" }),
      makeDemande({ id: "d2", statut: "ENVOYEE" }),
      makeDemande({ id: "d3", statut: "CLOTUREE", resultat: "ABOUTIE" }),
    ]);
    renderView();

    expect(await screen.findByText("Brouillons (1)")).toBeInTheDocument();
    expect(screen.getByText("Envoyées (1)")).toBeInTheDocument();
    expect(screen.getByText("Clôturées (1)")).toBeInTheDocument();
    expect(screen.getAllByText("Sac en raphia")).toHaveLength(3);
  });

  it("sends a draft after confirmation, moving it visually to Envoyées", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    listPurchaseRequestsMock.mockResolvedValueOnce([makeDemande({ id: "d1", statut: "EN_COURS" })]);
    sendPurchaseRequestMock.mockResolvedValueOnce(makeDemande({ id: "d1", statut: "ENVOYEE" }));
    listPurchaseRequestsMock.mockResolvedValueOnce([makeDemande({ id: "d1", statut: "ENVOYEE" })]);

    renderView();
    await screen.findByText("Brouillons (1)");

    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(sendPurchaseRequestMock).toHaveBeenCalledWith("d1"));
    expect(await screen.findByText("Envoyées (1)")).toBeInTheDocument();
    expect(screen.queryByText("Brouillons (1)")).not.toBeInTheDocument();
  });

  it("does not send when the confirmation is declined", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    listPurchaseRequestsMock.mockResolvedValueOnce([makeDemande({ id: "d1", statut: "EN_COURS" })]);

    renderView();
    await screen.findByText("Brouillons (1)");
    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));

    expect(sendPurchaseRequestMock).not.toHaveBeenCalled();
  });

  it("cancels an ENVOYEE demande after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    listPurchaseRequestsMock.mockResolvedValueOnce([makeDemande({ id: "d1", statut: "ENVOYEE" })]);
    cancelPurchaseRequestMock.mockResolvedValueOnce(
      makeDemande({ id: "d1", statut: "CLOTUREE", resultat: "ANNULEE" }),
    );
    listPurchaseRequestsMock.mockResolvedValueOnce([
      makeDemande({ id: "d1", statut: "CLOTUREE", resultat: "ANNULEE" }),
    ]);

    renderView();
    await screen.findByText("Envoyées (1)");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    await waitFor(() => expect(cancelPurchaseRequestMock).toHaveBeenCalledWith("d1"));
    expect(await screen.findByText("Clôturées (1)")).toBeInTheDocument();
    expect(await screen.findByText("annulée")).toBeInTheDocument();
  });

  it("removing the last item of a draft makes it disappear from the list", async () => {
    const user = userEvent.setup();
    const demande = makeDemande({ id: "d1", statut: "EN_COURS" });
    listPurchaseRequestsMock.mockResolvedValueOnce([demande]);
    removePurchaseRequestItemMock.mockResolvedValueOnce({ demande: null });
    listPurchaseRequestsMock.mockResolvedValueOnce([]);

    renderView();
    await screen.findByText("Sac en raphia");

    await user.click(screen.getByRole("button", { name: /Retirer Sac en raphia/ }));

    await waitFor(() =>
      expect(removePurchaseRequestItemMock).toHaveBeenCalledWith("d1", "p1"),
    );
    expect(await screen.findByText("Tu n'as pas encore de demande d'achat.")).toBeInTheDocument();
  });

  it("increments an item quantity via the + button (re-POST, additive)", async () => {
    const user = userEvent.setup();
    const demande = makeDemande({ id: "d1", statut: "EN_COURS" });
    listPurchaseRequestsMock.mockResolvedValueOnce([demande]);
    addPurchaseRequestItemMock.mockResolvedValueOnce({
      ...demande,
      items: [{ ...demande.items[0], quantite: 3 }],
    });
    listPurchaseRequestsMock.mockResolvedValueOnce([
      { ...demande, items: [{ ...demande.items[0], quantite: 3 }] },
    ]);

    renderView();
    await screen.findByText("Sac en raphia");

    await user.click(screen.getByRole("button", { name: /Augmenter la quantité de Sac en raphia/ }));

    await waitFor(() =>
      expect(addPurchaseRequestItemMock).toHaveBeenCalledWith("d1", { produitId: "p1", quantite: 1 }),
    );
    expect(await screen.findByText(/3 × 150 000 GNF/)).toBeInTheDocument();
  });

  it("shows a closed demande's outcome badge and an active « Laisser un avis » button", async () => {
    listPurchaseRequestsMock.mockResolvedValueOnce([
      makeDemande({ id: "d1", statut: "CLOTUREE", resultat: "ABOUTIE" }),
    ]);
    renderView();

    await screen.findByText("Clôturées (1)");
    expect(screen.getByText("aboutie")).toBeInTheDocument();
    const avisButton = screen.getByRole("button", { name: "Laisser un avis" });
    expect(avisButton).not.toHaveAttribute("aria-disabled");
    expect(screen.queryByText("bientôt")).not.toBeInTheDocument();
  });

  it("opens the review form when clicking « Laisser un avis » on a closed demande", async () => {
    const user = userEvent.setup();
    listPurchaseRequestsMock.mockResolvedValueOnce([
      makeDemande({ id: "d1", statut: "CLOTUREE", resultat: "ABOUTIE" }),
    ]);
    renderView();

    await user.click(await screen.findByRole("button", { name: "Laisser un avis" }));

    expect(screen.getByText("Comment s'est passé l'échange ?")).toBeInTheDocument();
  });
});
