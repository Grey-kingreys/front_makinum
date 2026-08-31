import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PublicUser } from "@/lib/auth/types";
import { GeoProvider } from "@/lib/geo";

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
    lieuVente: null,
    ...overrides,
  };
}

/** Même helper que ProductForm.test.tsx : stub `navigator.geolocation`. */
function stubGeolocation(
  impl: (success: PositionCallback, error?: PositionErrorCallback) => void,
): void {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: impl },
  });
}

function renderView(user: PublicUser) {
  useAuthMock.mockReturnValue({ user, loading: false, login: vi.fn(), logout: vi.fn(), refresh: refreshMock });
  return render(
    <GeoProvider>
      <VendeurParametresView />
    </GeoProvider>,
  );
}

describe("VendeurParametresView", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    updateVendorSettingsMock.mockReset();
    refreshMock.mockReset();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
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

    await waitFor(() =>
      expect(updateVendorSettingsMock).toHaveBeenCalledWith({ autoriseAdminPublication: true }),
    );
  });

  it("toggling from on calls the API with false", async () => {
    const user = userEvent.setup();
    updateVendorSettingsMock.mockResolvedValueOnce(makeUser({ autoriseAdminPublication: false }));
    renderView(makeUser({ autoriseAdminPublication: true }));

    await user.click(screen.getByRole("switch"));

    await waitFor(() =>
      expect(updateVendorSettingsMock).toHaveBeenCalledWith({ autoriseAdminPublication: false }),
    );
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

  describe("lieu de vente", () => {
    it("shows the saved-location confirmation without ever rendering raw coordinates", () => {
      renderView(makeUser({ lieuVente: { latitude: 9.6412, longitude: -13.5784 } }));

      expect(screen.getByText("Lieu de vente enregistré")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retirer" })).toBeInTheDocument();
      expect(screen.queryByText(/9\.6412/)).not.toBeInTheDocument();
      expect(screen.queryByText(/-13\.5784/)).not.toBeInTheDocument();
    });

    it("shows no saved-location confirmation when the account has no lieu de vente", () => {
      renderView(makeUser({ lieuVente: null }));

      expect(screen.queryByText("Lieu de vente enregistré")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Utiliser ma position actuelle" }),
      ).toBeInTheDocument();
    });

    it("capturing the position PATCHes lieuVente with the coordinates, refreshes, and confirms", async () => {
      stubGeolocation((success) => {
        success({ coords: { latitude: 9.6412, longitude: -13.5784 } } as GeolocationPosition);
      });
      const user = userEvent.setup();
      updateVendorSettingsMock.mockResolvedValueOnce(
        makeUser({ lieuVente: { latitude: 9.6412, longitude: -13.5784 } }),
      );
      renderView(makeUser({ lieuVente: null }));

      await user.click(screen.getByRole("button", { name: "Utiliser ma position actuelle" }));

      await waitFor(() =>
        expect(updateVendorSettingsMock).toHaveBeenCalledWith({
          lieuVente: { latitude: 9.6412, longitude: -13.5784 },
        }),
      );
      await waitFor(() => expect(refreshMock).toHaveBeenCalled());
      expect(await screen.findByText("Réglage enregistré.")).toBeInTheDocument();
    });

    it("shows a geoloc failure message when the browser refuses the position, without calling the API", async () => {
      stubGeolocation((_success, error) => {
        error?.({ code: 1, message: "User denied Geolocation" } as GeolocationPositionError);
      });
      const user = userEvent.setup();
      renderView(makeUser({ lieuVente: null }));

      await user.click(screen.getByRole("button", { name: "Utiliser ma position actuelle" }));

      expect(await screen.findByText("Position indisponible — réessaie.")).toBeInTheDocument();
      expect(updateVendorSettingsMock).not.toHaveBeenCalled();
    });

    it("clicking « Retirer » PATCHes lieuVente: null, refreshes, and confirms", async () => {
      const user = userEvent.setup();
      updateVendorSettingsMock.mockResolvedValueOnce(makeUser({ lieuVente: null }));
      renderView(makeUser({ lieuVente: { latitude: 9.6412, longitude: -13.5784 } }));

      await user.click(screen.getByRole("button", { name: "Retirer" }));

      await waitFor(() =>
        expect(updateVendorSettingsMock).toHaveBeenCalledWith({ lieuVente: null }),
      );
      await waitFor(() => expect(refreshMock).toHaveBeenCalled());
      expect(await screen.findByText("Réglage enregistré.")).toBeInTheDocument();
    });

    it("shows an API error and leaves the saved location message alone when the PATCH fails", async () => {
      stubGeolocation((success) => {
        success({ coords: { latitude: 9.6412, longitude: -13.5784 } } as GeolocationPosition);
      });
      const user = userEvent.setup();
      updateVendorSettingsMock.mockRejectedValueOnce(new ApiError(500, "Erreur serveur"));
      renderView(makeUser({ lieuVente: null }));

      await user.click(screen.getByRole("button", { name: "Utiliser ma position actuelle" }));

      expect(await screen.findByText("Erreur serveur")).toBeInTheDocument();
      expect(refreshMock).not.toHaveBeenCalled();
      expect(screen.queryByText("Lieu de vente enregistré")).not.toBeInTheDocument();
    });
  });
});
