import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DemandesRecuesProvider } from "@/lib/purchase-requests";
import type { PurchaseRequestView } from "@/lib/purchase-requests/types";

import { VendeurDemandesView } from "./VendeurDemandesView";

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

function renderView() {
  return render(
    <DemandesRecuesProvider>
      <VendeurDemandesView />
    </DemandesRecuesProvider>,
  );
}

describe("VendeurDemandesView", () => {
  beforeEach(() => {
    listPurchaseRequestsMock.mockReset();
    closePurchaseRequestMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches with vue=vendeur", async () => {
    listPurchaseRequestsMock.mockResolvedValueOnce([]);
    renderView();

    await waitFor(() => expect(listPurchaseRequestsMock).toHaveBeenCalledWith("vendeur"));
  });

  it("shows the empty state when there is no received demande", async () => {
    listPurchaseRequestsMock.mockResolvedValueOnce([]);
    renderView();

    expect(
      await screen.findByText("Tu n'as reçu aucune demande d'achat pour l'instant."),
    ).toBeInTheDocument();
  });

  it("groups received demandes by statut (Envoyées / Clôturées)", async () => {
    listPurchaseRequestsMock.mockResolvedValueOnce([
      makeDemande({ id: "d1", statut: "ENVOYEE" }),
      makeDemande({ id: "d2", statut: "CLOTUREE", resultat: "ABOUTIE" }),
    ]);
    renderView();

    expect(await screen.findByText("Envoyées (1)")).toBeInTheDocument();
    expect(screen.getByText("Clôturées (1)")).toBeInTheDocument();
    expect(screen.getAllByText("Ibrahima Diallo")).toHaveLength(2);
  });

  it("closes a demande as aboutie after confirmation, POSTing the right payload and moving it to Clôturées", async () => {
    const user = userEvent.setup();
    listPurchaseRequestsMock.mockResolvedValueOnce([makeDemande({ id: "d1", statut: "ENVOYEE" })]);
    closePurchaseRequestMock.mockResolvedValueOnce(
      makeDemande({ id: "d1", statut: "CLOTUREE", resultat: "ABOUTIE" }),
    );
    listPurchaseRequestsMock.mockResolvedValueOnce([
      makeDemande({ id: "d1", statut: "CLOTUREE", resultat: "ABOUTIE" }),
    ]);

    renderView();
    await screen.findByText("Envoyées (1)");

    await user.click(screen.getByRole("button", { name: "Clôturer · aboutie" }));

    const dialog = await screen.findByRole("dialog");
    expect(closePurchaseRequestMock).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Clôturer" }));

    await waitFor(() => expect(closePurchaseRequestMock).toHaveBeenCalledWith("d1", "ABOUTIE"));
    expect(await screen.findByText("Clôturées (1)")).toBeInTheDocument();
    expect(screen.queryByText("Envoyées (1)")).not.toBeInTheDocument();
    expect(screen.getByText("aboutie")).toBeInTheDocument();
  });

  it("closes a demande as annulee after confirmation, POSTing the right payload", async () => {
    const user = userEvent.setup();
    listPurchaseRequestsMock.mockResolvedValueOnce([makeDemande({ id: "d1", statut: "ENVOYEE" })]);
    closePurchaseRequestMock.mockResolvedValueOnce(
      makeDemande({ id: "d1", statut: "CLOTUREE", resultat: "ANNULEE" }),
    );
    listPurchaseRequestsMock.mockResolvedValueOnce([
      makeDemande({ id: "d1", statut: "CLOTUREE", resultat: "ANNULEE" }),
    ]);

    renderView();
    await screen.findByText("Envoyées (1)");

    await user.click(screen.getByRole("button", { name: "Clôturer · annulée" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Clôturer" }));

    await waitFor(() => expect(closePurchaseRequestMock).toHaveBeenCalledWith("d1", "ANNULEE"));
    expect(await screen.findByText("annulée")).toBeInTheDocument();
  });

  it("does not close when the confirmation is declined", async () => {
    const user = userEvent.setup();
    listPurchaseRequestsMock.mockResolvedValueOnce([makeDemande({ id: "d1", statut: "ENVOYEE" })]);

    renderView();
    await screen.findByText("Envoyées (1)");
    await user.click(screen.getByRole("button", { name: "Clôturer · aboutie" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(closePurchaseRequestMock).not.toHaveBeenCalled();
  });

  it("shows an error with a retry action when the fetch fails", async () => {
    const user = userEvent.setup();
    listPurchaseRequestsMock.mockRejectedValueOnce(new Error("boom"));
    listPurchaseRequestsMock.mockResolvedValueOnce([]);
    renderView();

    expect(
      await screen.findByText("Impossible de charger les demandes reçues. Réessaie."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(listPurchaseRequestsMock).toHaveBeenCalledTimes(2));
  });
});
