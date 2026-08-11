import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PublicUser } from "@/lib/auth/types";

import { VendeurParametresView } from "./VendeurParametresView";

const { useAuthMock, updateVendorSettingsMock, refreshMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  updateVendorSettingsMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ useAuth: useAuthMock }));

// Mock partiel : updateVendorSettings() est contrôlé par le test,
// describeVendorSettingsError (mapping de codes) reste l'implémentation
// réelle — même convention que DevenirVendeurView.test.tsx.
vi.mock("@/lib/vendor-settings", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/vendor-settings")>("@/lib/vendor-settings");
  return { ...actual, updateVendorSettings: updateVendorSettingsMock };
});

function makeUser(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: "v1",
    nom: "Fatoumata Bangoura",
    telephone: "+224622000000",
    telephoneVerifie: true,
    email: null,
    emailVerifie: false,
    role: "VENDEUR",
    statutVendeur: "LIBRE",
    statutCompte: "ACTIF",
    vendeurValide: true,
    autoriseAdminPublication: false,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

function renderView(user: PublicUser) {
  useAuthMock.mockReturnValue({ user, loading: false, login: vi.fn(), logout: vi.fn(), refresh: refreshMock });
  return render(<VendeurParametresView />);
}

describe("VendeurParametresView", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    updateVendorSettingsMock.mockReset();
    refreshMock.mockReset();
  });

  it("renders the switch off when the session has autoriseAdminPublication: false", () => {
    renderView(makeUser({ autoriseAdminPublication: false }));

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("renders the switch on when the session has autoriseAdminPublication: true", () => {
    renderView(makeUser({ autoriseAdminPublication: true }));

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("toggling from off calls the API with true", async () => {
    const user = userEvent.setup();
    updateVendorSettingsMock.mockResolvedValueOnce(makeUser({ autoriseAdminPublication: true }));
    renderView(makeUser({ autoriseAdminPublication: false }));

    await user.click(screen.getByRole("switch"));

    await waitFor(() => expect(updateVendorSettingsMock).toHaveBeenCalledWith(true));
  });

  it("toggling from on calls the API with false", async () => {
    const user = userEvent.setup();
    updateVendorSettingsMock.mockResolvedValueOnce(makeUser({ autoriseAdminPublication: false }));
    renderView(makeUser({ autoriseAdminPublication: true }));

    await user.click(screen.getByRole("switch"));

    await waitFor(() => expect(updateVendorSettingsMock).toHaveBeenCalledWith(false));
  });

  it("refreshes the session on success, so the switch reflects the persisted value", async () => {
    const user = userEvent.setup();
    updateVendorSettingsMock.mockResolvedValueOnce(makeUser({ autoriseAdminPublication: true }));
    renderView(makeUser({ autoriseAdminPublication: false }));

    await user.click(screen.getByRole("switch"));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(await screen.findByText("Réglage enregistré.")).toBeInTheDocument();
  });

  it("shows an error and leaves the switch unchanged when the API call fails", async () => {
    const user = userEvent.setup();
    updateVendorSettingsMock.mockRejectedValueOnce(new ApiError(500, "Erreur serveur"));
    renderView(makeUser({ autoriseAdminPublication: false }));

    await user.click(screen.getByRole("switch"));

    expect(await screen.findByText("Erreur serveur")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
    // La session n'a pas changé (refresh jamais appelé) : la source de vérité
    // unique (user.autoriseAdminPublication) reste `false`, rien à annuler.
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });
});
