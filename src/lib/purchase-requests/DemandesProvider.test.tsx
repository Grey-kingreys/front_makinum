import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PurchaseRequestView } from "./types";

const { listPurchaseRequestsMock } = vi.hoisted(() => ({
  listPurchaseRequestsMock: vi.fn(),
}));

vi.mock("./api", () => ({ listPurchaseRequests: listPurchaseRequestsMock }));

// Import after the mock so DemandesProvider picks up the mocked module.
import { DemandesProvider, useDemandes } from "./DemandesProvider";

function makeDemande(overrides: Partial<PurchaseRequestView> = {}): PurchaseRequestView {
  return {
    id: "d1",
    statut: "EN_COURS",
    resultat: null,
    acheteurId: "moi",
    vendeurId: "v1",
    dateCreation: "2026-08-01T00:00:00.000Z",
    dateMiseAJour: "2026-08-01T00:00:00.000Z",
    items: [],
    interlocuteur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "VERIFIE" },
    ...overrides,
  };
}

function Harness() {
  const { demandes, loading, error, draftCount, refresh } = useDemandes();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? "none"}</span>
      <span data-testid="draftCount">{draftCount}</span>
      <span data-testid="count">{demandes?.length ?? -1}</span>
      <button onClick={() => void refresh()}>refresh</button>
    </div>
  );
}

describe("DemandesProvider", () => {
  beforeEach(() => {
    listPurchaseRequestsMock.mockReset();
  });

  it("fetches on mount and computes draftCount from EN_COURS entries", async () => {
    listPurchaseRequestsMock.mockResolvedValueOnce([
      makeDemande({ id: "d1", statut: "EN_COURS" }),
      makeDemande({ id: "d2", statut: "EN_COURS" }),
      makeDemande({ id: "d3", statut: "ENVOYEE" }),
    ]);

    render(
      <DemandesProvider>
        <Harness />
      </DemandesProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("count")).toHaveTextContent("3");
    expect(screen.getByTestId("draftCount")).toHaveTextContent("2");
  });

  it("fetches with vue=acheteur (backend now scopes the list, no client-side filter needed)", async () => {
    listPurchaseRequestsMock.mockResolvedValueOnce([makeDemande({ id: "d1" })]);

    render(
      <DemandesProvider>
        <Harness />
      </DemandesProvider>,
    );

    await waitFor(() => expect(listPurchaseRequestsMock).toHaveBeenCalledWith("acheteur"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("exposes an error message when the fetch fails, and 0 for draftCount", async () => {
    listPurchaseRequestsMock.mockRejectedValueOnce(new Error("boom"));

    render(
      <DemandesProvider>
        <Harness />
      </DemandesProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("Impossible de charger tes demandes"),
    );
    expect(screen.getByTestId("draftCount")).toHaveTextContent("0");
  });

  it("refresh() re-fetches and updates the shared state", async () => {
    const user = userEvent.setup();
    listPurchaseRequestsMock.mockResolvedValueOnce([makeDemande({ id: "d1" })]);
    listPurchaseRequestsMock.mockResolvedValueOnce([
      makeDemande({ id: "d1" }),
      makeDemande({ id: "d2" }),
    ]);

    render(
      <DemandesProvider>
        <Harness />
      </DemandesProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
    await user.click(screen.getByText("refresh"));
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"));
    expect(listPurchaseRequestsMock).toHaveBeenCalledTimes(2);
  });
});
