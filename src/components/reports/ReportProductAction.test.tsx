import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PublicUser } from "@/lib/auth/types";

import { ReportProductAction } from "./ReportProductAction";

const { useAuthMock, createReportMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  createReportMock: vi.fn(),
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, useAuth: useAuthMock };
});
vi.mock("next/navigation", () => ({ usePathname: () => "/produits/p1" }));
vi.mock("@/lib/reports/api", () => ({ createReport: createReportMock }));

function makeUser(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: "u1",
    nom: "Ibrahima Camara",
    telephone: "+224622111111",
    telephoneVerifie: true,
    email: null,
    emailVerifie: false,
    role: "ACHETEUR",
    statutVendeur: "LIBRE",
    statutCompte: "ACTIF",
    vendeurValide: true,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

describe("ReportProductAction", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: makeUser(), loading: false, login: vi.fn(), logout: vi.fn(), refresh: vi.fn() });
    createReportMock.mockReset();
  });

  it("renders nothing when the connected user is the targeted vendeur (auto-signalement)", () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ id: "v1" }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    render(<ReportProductAction vendeurId="v1" produitId="p1" />);

    expect(screen.queryByRole("button", { name: "Signaler ce produit" })).not.toBeInTheDocument();
  });

  it("renders a link to /connexion?returnTo=<chemin courant> instead of the modal when logged out (T51)", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: vi.fn(), refresh: vi.fn() });
    render(<ReportProductAction vendeurId="v1" produitId="p1" />);

    const link = screen.getByRole("link", { name: "Signaler ce produit" });
    expect(link).toHaveAttribute("href", "/connexion?returnTo=%2Fproduits%2Fp1");
    expect(screen.queryByRole("button", { name: "Signaler ce produit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(createReportMock).not.toHaveBeenCalled();
  });

  it("opens the modal when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<ReportProductAction vendeurId="v1" produitId="p1" />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Signaler ce produit" }));

    expect(screen.getByRole("dialog", { name: "Signaler ce produit" })).toBeInTheDocument();
  });

  it("shows a live character counter for the motif field", async () => {
    const user = userEvent.setup();
    render(<ReportProductAction vendeurId="v1" produitId="p1" />);
    await user.click(screen.getByRole("button", { name: "Signaler ce produit" }));

    expect(screen.getByText("0 / 500")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Motif du signalement"), "Produit non conforme");

    expect(screen.getByText("20 / 500")).toBeInTheDocument();
  });

  it("blocks submission under 5 characters without calling the API", async () => {
    const user = userEvent.setup();
    render(<ReportProductAction vendeurId="v1" produitId="p1" />);
    await user.click(screen.getByRole("button", { name: "Signaler ce produit" }));

    await user.type(screen.getByLabelText("Motif du signalement"), "ab");
    await user.click(screen.getByRole("button", { name: "Envoyer le signalement" }));

    expect(createReportMock).not.toHaveBeenCalled();
    expect(screen.getByText("Décris le problème en au moins 5 caractères.")).toBeInTheDocument();
  });

  it("submits { utilisateurCibleId, produitId, motif } and shows a confirmation", async () => {
    const user = userEvent.setup();
    createReportMock.mockResolvedValueOnce({
      id: "r1",
      motif: "Produit non conforme aux photos annoncées",
      statut: "NOUVEAU",
      actionAdmin: "AUCUNE",
      dateCreation: "2026-08-04T00:00:00.000Z",
      signaleur: { id: "u1", nom: "Ibrahima Camara" },
      cible: { id: "v1", nom: "Fatoumata Bangoura", statutCompte: "ACTIF", statutVendeur: "LIBRE" },
      produit: { id: "p1", titre: "Sac", actif: true },
    });
    render(<ReportProductAction vendeurId="v1" produitId="p1" />);
    await user.click(screen.getByRole("button", { name: "Signaler ce produit" }));

    await user.type(
      screen.getByLabelText("Motif du signalement"),
      "Produit non conforme aux photos annoncées",
    );
    await user.click(screen.getByRole("button", { name: "Envoyer le signalement" }));

    await waitFor(() =>
      expect(createReportMock).toHaveBeenCalledWith({
        utilisateurCibleId: "v1",
        produitId: "p1",
        motif: "Produit non conforme aux photos annoncées",
      }),
    );
    expect(await screen.findByText("Signalement envoyé")).toBeInTheDocument();
    expect(
      screen.getByText(/Signalement transmis\. Il apparaît maintenant dans la file de modération/),
    ).toBeInTheDocument();
  });

  it("maps CANNOT_REPORT_SELF to a clear inline error and keeps the modal open", async () => {
    const user = userEvent.setup();
    createReportMock.mockRejectedValueOnce(
      new ApiError(400, "Impossible de se signaler soi-même", "CANNOT_REPORT_SELF"),
    );
    render(<ReportProductAction vendeurId="v1" produitId="p1" />);
    await user.click(screen.getByRole("button", { name: "Signaler ce produit" }));

    await user.type(screen.getByLabelText("Motif du signalement"), "Un motif suffisamment long");
    await user.click(screen.getByRole("button", { name: "Envoyer le signalement" }));

    expect(await screen.findByText("Impossible de se signaler soi-même.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes and resets the form when « Annuler » is clicked", async () => {
    const user = userEvent.setup();
    render(<ReportProductAction vendeurId="v1" produitId="p1" />);
    await user.click(screen.getByRole("button", { name: "Signaler ce produit" }));

    await user.type(screen.getByLabelText("Motif du signalement"), "Un motif quelconque");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Signaler ce produit" }));
    expect(screen.getByLabelText("Motif du signalement")).toHaveValue("");
  });
});
