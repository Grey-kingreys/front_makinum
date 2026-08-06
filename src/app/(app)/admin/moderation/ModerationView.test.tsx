import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ReportView } from "@/lib/reports";

import { ModerationView } from "./ModerationView";

const { listReportsMock, updateReportMock } = vi.hoisted(() => ({
  listReportsMock: vi.fn(),
  updateReportMock: vi.fn(),
}));

vi.mock("@/lib/reports/api", () => ({
  listReports: listReportsMock,
  updateReport: updateReportMock,
}));

function makeReport(overrides: Partial<ReportView> = {}): ReportView {
  return {
    id: "r1",
    motif: "Le vendeur demande un acompte par transfert avant la rencontre.",
    statut: "NOUVEAU",
    actionAdmin: "AUCUNE",
    dateCreation: "2026-08-01T00:00:00.000Z",
    signaleur: { id: "u1", nom: "Ibrahima Camara" },
    cible: { id: "v1", nom: "Fatoumata Bangoura", statutCompte: "ACTIF", statutVendeur: "LIBRE" },
    produit: { id: "p1", titre: "Téléphone Android 128 Go", actif: true },
    ...overrides,
  };
}

describe("ModerationView", () => {
  beforeEach(() => {
    listReportsMock.mockReset();
    updateReportMock.mockReset();
    listReportsMock.mockResolvedValue({ items: [makeReport()], total: 1, page: 1, limit: 20 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the report list — signaleur → cible, motif, produit link, statut badge", async () => {
    render(<ModerationView />);

    expect(await screen.findByText("Ibrahima Camara")).toBeInTheDocument();
    expect(screen.getByText("Fatoumata Bangoura")).toBeInTheDocument();
    expect(
      screen.getByText("Le vendeur demande un acompte par transfert avant la rencontre."),
    ).toBeInTheDocument();
    expect(screen.getByText("Nouveau")).toBeInTheDocument();
    const produitLink = screen.getByRole("link", { name: /Téléphone Android 128 Go/ });
    expect(produitLink).toHaveAttribute("href", "/produits/p1");
  });

  it("re-fetches with the selected statut when a filter tab is clicked", async () => {
    const user = userEvent.setup();
    render(<ModerationView />);
    await screen.findByText("Ibrahima Camara");

    await user.click(screen.getByRole("button", { name: "En examen" }));

    await waitFor(() =>
      expect(listReportsMock).toHaveBeenCalledWith({ statut: "EN_EXAMEN", page: 1, limit: 20 }),
    );
  });

  it("disables the DESACTIVATION option when the report has no linked product", async () => {
    listReportsMock.mockResolvedValue({
      items: [makeReport({ id: "r2", produit: null })],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<ModerationView />);
    await screen.findByText("Ibrahima Camara");

    expect(screen.getByRole("radio", { name: /Désactiver le produit/ })).toBeDisabled();
  });

  it("passes a NOUVEAU report to EN_EXAMEN", async () => {
    const user = userEvent.setup();
    updateReportMock.mockResolvedValueOnce(makeReport({ statut: "EN_EXAMEN" }));
    render(<ModerationView />);
    await screen.findByText("Ibrahima Camara");

    await user.click(screen.getByRole("button", { name: "Passer en examen" }));

    await waitFor(() =>
      expect(updateReportMock).toHaveBeenCalledWith("r1", { statut: "EN_EXAMEN" }),
    );
  });

  it("opens a confirmation dialog before treating with DESACTIVATION, then PATCHes { statut: TRAITE, actionAdmin: DESACTIVATION } on confirm", async () => {
    const user = userEvent.setup();
    updateReportMock.mockResolvedValueOnce(
      makeReport({ statut: "TRAITE", actionAdmin: "DESACTIVATION" }),
    );
    render(<ModerationView />);
    await screen.findByText("Ibrahima Camara");

    await user.click(screen.getByRole("radio", { name: /Désactiver le produit/ }));
    await user.click(screen.getByRole("button", { name: "Marquer comme traité" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/ne sera plus visible des acheteurs/);
    expect(updateReportMock).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Désactiver" }));

    await waitFor(() =>
      expect(updateReportMock).toHaveBeenCalledWith("r1", {
        statut: "TRAITE",
        actionAdmin: "DESACTIVATION",
      }),
    );
    expect(await screen.findByText(/Traité : Désactiver le produit/)).toBeInTheDocument();
  });

  it("does not call the API when the DESACTIVATION/SUSPENSION confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<ModerationView />);
    await screen.findByText("Ibrahima Camara");

    await user.click(screen.getByRole("radio", { name: /Suspendre le vendeur/ }));
    await user.click(screen.getByRole("button", { name: "Marquer comme traité" }));

    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(updateReportMock).not.toHaveBeenCalled();
  });

  it("closes the confirmation dialog on Escape without calling the API", async () => {
    const user = userEvent.setup();
    render(<ModerationView />);
    await screen.findByText("Ibrahima Camara");

    await user.click(screen.getByRole("radio", { name: /Suspendre le vendeur/ }));
    await user.click(screen.getByRole("button", { name: "Marquer comme traité" }));

    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(updateReportMock).not.toHaveBeenCalled();
  });

  it("treats with AUCUNE without opening a confirmation dialog", async () => {
    const user = userEvent.setup();
    updateReportMock.mockResolvedValueOnce(makeReport({ statut: "TRAITE", actionAdmin: "AUCUNE" }));
    render(<ModerationView />);
    await screen.findByText("Ibrahima Camara");

    await user.click(screen.getByRole("button", { name: "Marquer comme traité" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(updateReportMock).toHaveBeenCalledWith("r1", { statut: "TRAITE", actionAdmin: "AUCUNE" }),
    );
  });
});
