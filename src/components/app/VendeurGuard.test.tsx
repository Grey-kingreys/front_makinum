import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, resetSession } from "@/lib/auth";
import type { PublicUser } from "@/lib/auth/types";

import { VendeurGuard } from "./VendeurGuard";

type FetchMock = ReturnType<typeof vi.fn>;

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function makeUser(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: "u1",
    nom: "Fatoumata Bangoura",
    telephone: "+224622000000",
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

function renderGuard(user: PublicUser) {
  // Session restaurée au montage par POST /auth/refresh (T28).
  const fetchMock = fetch as unknown as FetchMock;
  fetchMock.mockResolvedValueOnce(jsonResponse({ accessToken: "restored-token", user }));

  return render(
    <AuthProvider>
      <VendeurGuard>
        <div>contenu vendeur</div>
      </VendeurGuard>
    </AuthProvider>,
  );
}

describe("VendeurGuard", () => {
  beforeEach(() => {
    resetSession();
    vi.stubGlobal("fetch", vi.fn());
    replaceMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSession();
  });

  it("renders the vendor content for a VENDEUR user", async () => {
    renderGuard(makeUser({ role: "VENDEUR" }));

    expect(await screen.findByText("contenu vendeur")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects an ACHETEUR to /produits and renders nothing", async () => {
    renderGuard(makeUser({ role: "ACHETEUR" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/produits"));
    expect(screen.queryByText("contenu vendeur")).not.toBeInTheDocument();
  });

  it("redirects an ADMIN to /produits and renders nothing", async () => {
    renderGuard(makeUser({ role: "ADMIN" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/produits"));
    expect(screen.queryByText("contenu vendeur")).not.toBeInTheDocument();
  });
});
