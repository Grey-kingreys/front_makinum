import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PurchaseRequestView } from "./types";

const { listPurchaseRequestsMock } = vi.hoisted(() => ({
  listPurchaseRequestsMock: vi.fn(),
}));

vi.mock("./api", () => ({ listPurchaseRequests: listPurchaseRequestsMock }));

// Import after the mock so DemandesRecuesProvider picks up the mocked module.
import { DemandesRecuesProvider, useDemandesRecues } from "./DemandesRecuesProvider";

function makeDemande(overrides: Partial<PurchaseRequestView> = {}): PurchaseRequestView {
  return {
    id: "d1",
    statut: "ENVOYEE",
    resultat: null,
    acheteurId: "a1",
    vendeurId: "moi",
    dateCreation: "2026-08-01T00:00:00.000Z",
    dateMiseAJour: "2026-08-01T00:00:00.000Z",
    items: [],
    interlocuteur: { id: "a1", nom: "Ibrahima Diallo" },
    ...overrides,
  };
}

function Harness() {
  const { demandesRecues, loading, error, pendingCount, refresh } = useDemandesRecues();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? "none"}</span>
      <span data-testid="pendingCount">{pendingCount}</span>
      <span data-testid="count">{demandesRecues?.length ?? -1}</span>
      <button onClick={() => void refresh()}>refresh</button>
    </div>
  );
}

describe("DemandesRecuesProvider", () => {
  beforeEach(() => {
    listPurchaseRequestsMock.mockReset();
  });

  it("fetches with vue=vendeur on mount and computes pendingCount from ENVOYEE entries", async () => {
    listPurchaseRequestsMock.mockResolvedValueOnce([
      makeDemande({ id: "d1", statut: "ENVOYEE" }),
      makeDemande({ id: "d2", statut: "ENVOYEE" }),
      makeDemande({ id: "d3", statut: "CLOTUREE", resultat: "ABOUTIE" }),
    ]);

    render(
      <DemandesRecuesProvider>
        <Harness />
      </DemandesRecuesProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(listPurchaseRequestsMock).toHaveBeenCalledWith("vendeur");
    expect(screen.getByTestId("count")).toHaveTextContent("3");
    expect(screen.getByTestId("pendingCount")).toHaveTextContent("2");
  });

  it("exposes an error message when the fetch fails, and 0 for pendingCount", async () => {
    listPurchaseRequestsMock.mockRejectedValueOnce(new Error("boom"));

    render(
      <DemandesRecuesProvider>
        <Harness />
      </DemandesRecuesProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Impossible de charger les demandes reçues",
      ),
    );
    expect(screen.getByTestId("pendingCount")).toHaveTextContent("0");
  });

  it("refresh() re-fetches and updates the shared state", async () => {
    const user = userEvent.setup();
    listPurchaseRequestsMock.mockResolvedValueOnce([makeDemande({ id: "d1", statut: "ENVOYEE" })]);
    listPurchaseRequestsMock.mockResolvedValueOnce([
      makeDemande({ id: "d1", statut: "CLOTUREE", resultat: "ABOUTIE" }),
    ]);

    render(
      <DemandesRecuesProvider>
        <Harness />
      </DemandesRecuesProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("pendingCount")).toHaveTextContent("1"));
    await user.click(screen.getByText("refresh"));
    await waitFor(() => expect(screen.getByTestId("pendingCount")).toHaveTextContent("0"));
    expect(listPurchaseRequestsMock).toHaveBeenCalledTimes(2);
  });
});
