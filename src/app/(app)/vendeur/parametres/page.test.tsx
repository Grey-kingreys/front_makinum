import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicUser } from "@/lib/auth/types";

import VendeurParametresPage from "./page";

const { useAuthMock, replaceMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

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

/**
 * Vérifie que la page (VendeurGuard + VendeurParametresView) est bien
 * réservée au rôle VENDEUR, comme les autres pages /vendeur/* — le contenu
 * lui-même (interrupteur, etc.) est couvert par VendeurParametresView.test.tsx.
 */
describe("VendeurParametresPage", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    replaceMock.mockClear();
  });

  it("renders the settings page for a VENDEUR", () => {
    useAuthMock.mockReturnValue({
      user: makeUser(),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    render(<VendeurParametresPage />);

    expect(screen.getByRole("heading", { name: "Paramètres" })).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects a non-VENDEUR (ACHETEUR) to /produits and renders nothing", async () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ role: "ACHETEUR" }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    render(<VendeurParametresPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/produits"));
    expect(screen.queryByRole("heading", { name: "Paramètres" })).not.toBeInTheDocument();
  });

  it("redirects an ADMIN to /produits and renders nothing", async () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ role: "ADMIN" }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    render(<VendeurParametresPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/produits"));
    expect(screen.queryByRole("heading", { name: "Paramètres" })).not.toBeInTheDocument();
  });
});
