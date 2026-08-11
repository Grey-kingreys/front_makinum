import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicUser } from "@/lib/auth/types";

import VendeurLayout from "./layout";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("@/lib/auth", () => ({ useAuth: useAuthMock }));

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
 * Bandeau « compte vendeur en attente de validation » (T30) : porté par le
 * layout du groupe /vendeur (partagé par catalogue, demandes reçues,
 * publication/édition de produit) plutôt que dupliqué dans chaque vue.
 */
describe("VendeurLayout", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("shows the pending-validation banner for an unvalidated VENDEUR", () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ vendeurValide: false }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    render(
      <VendeurLayout>
        <p>Contenu de la page</p>
      </VendeurLayout>,
    );

    expect(
      screen.getByText(/en attente de validation par un administrateur/),
    ).toBeInTheDocument();
    expect(screen.getByText("Contenu de la page")).toBeInTheDocument();
  });

  it("hides the banner for a validated VENDEUR", () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ vendeurValide: true }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    render(
      <VendeurLayout>
        <p>Contenu de la page</p>
      </VendeurLayout>,
    );

    expect(
      screen.queryByText(/en attente de validation par un administrateur/),
    ).not.toBeInTheDocument();
  });

  it("hides the banner for other roles even when vendeurValide is false", () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ role: "ACHETEUR", vendeurValide: false }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    render(
      <VendeurLayout>
        <p>Contenu de la page</p>
      </VendeurLayout>,
    );

    expect(
      screen.queryByText(/en attente de validation par un administrateur/),
    ).not.toBeInTheDocument();
  });
});
