import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { DemandesRecuesProvider } from "@/lib/purchase-requests";
import type { PurchaseRequestView } from "@/lib/purchase-requests/types";

import { DemandeRecueCard } from "./DemandeRecueCard";

const { listPurchaseRequestsMock, closePurchaseRequestMock } = vi.hoisted(() => ({
  listPurchaseRequestsMock: vi.fn(),
  closePurchaseRequestMock: vi.fn(),
}));

vi.mock("@/lib/purchase-requests/api", () => ({
  listPurchaseRequests: listPurchaseRequestsMock,
  closePurchaseRequest: closePurchaseRequestMock,
}));

function makeDemande(overrides: Partial<PurchaseRequestView> = {}): PurchaseRequestView {
  return {
    id: "d1",
    statut: "ENVOYEE",
    resultat: null,
    acheteurId: "a1",
    vendeurId: "moi",
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
    interlocuteur: { id: "a1", nom: "Ibrahima Diallo" },
    ...overrides,
  };
}

function renderCard(demande: PurchaseRequestView) {
  return render(
    <DemandesRecuesProvider>
      <DemandeRecueCard demande={demande} />
    </DemandesRecuesProvider>,
  );
}

describe("DemandeRecueCard", () => {
  beforeEach(() => {
    listPurchaseRequestsMock.mockReset();
    listPurchaseRequestsMock.mockResolvedValue([]);
    closePurchaseRequestMock.mockReset();
  });

  it("renders the buyer, items and total for an ENVOYEE demande", async () => {
    renderCard(makeDemande());

    expect(screen.getByText("Ibrahima Diallo")).toBeInTheDocument();
    expect(screen.getByText("Sac en raphia")).toBeInTheDocument();
    expect(screen.getByText(/2 × 150 000 GNF/)).toBeInTheDocument();
    expect(screen.getByText("Envoyée")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clôturer · aboutie" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clôturer · annulée" })).toBeInTheDocument();
  });

  it("closes as aboutie after confirmation, calling POST cloturer with the right payload", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    closePurchaseRequestMock.mockResolvedValueOnce(
      makeDemande({ statut: "CLOTUREE", resultat: "ABOUTIE" }),
    );
    renderCard(makeDemande());

    await user.click(screen.getByRole("button", { name: "Clôturer · aboutie" }));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Ibrahima Diallo sera notifié et pourra laisser un avis"),
    );
    await waitFor(() => expect(closePurchaseRequestMock).toHaveBeenCalledWith("d1", "ABOUTIE"));
    await waitFor(() => expect(listPurchaseRequestsMock).toHaveBeenCalledTimes(2));
  });

  it("closes as annulee after confirmation, calling POST cloturer with the right payload", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    closePurchaseRequestMock.mockResolvedValueOnce(
      makeDemande({ statut: "CLOTUREE", resultat: "ANNULEE" }),
    );
    renderCard(makeDemande());

    await user.click(screen.getByRole("button", { name: "Clôturer · annulée" }));

    await waitFor(() => expect(closePurchaseRequestMock).toHaveBeenCalledWith("d1", "ANNULEE"));
  });

  it("does not close when the confirmation is declined", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderCard(makeDemande());

    await user.click(screen.getByRole("button", { name: "Clôturer · aboutie" }));

    expect(closePurchaseRequestMock).not.toHaveBeenCalled();
  });

  it("shows an error message when the closure fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    closePurchaseRequestMock.mockRejectedValueOnce(
      new ApiError(409, "Transition d'état invalide", "INVALID_STATE_TRANSITION"),
    );
    renderCard(makeDemande());

    await user.click(screen.getByRole("button", { name: "Clôturer · aboutie" }));

    expect(await screen.findByText("Cette demande a changé d'état, recharge la page.")).toBeInTheDocument();
  });

  it("renders the outcome badge and the closed message for a CLOTUREE demande, without clôturer buttons", () => {
    renderCard(makeDemande({ statut: "CLOTUREE", resultat: "ABOUTIE" }));

    expect(screen.getByText("aboutie")).toBeInTheDocument();
    expect(
      screen.getByText("Demande clôturée. L'acheteur a été notifié et peut laisser un avis."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Clôturer/ })).not.toBeInTheDocument();
  });
});
