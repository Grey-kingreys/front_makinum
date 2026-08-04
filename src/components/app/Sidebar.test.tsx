import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GeoProvider } from "@/lib/geo";
import type { PublicUser } from "@/lib/auth/types";

import { Sidebar } from "./Sidebar";

const { usePathnameMock, pushMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/vendeur/catalogue"),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  // Sidebar renders <SearchField>, which also calls useRouter().
  useRouter: () => ({ push: pushMock }),
}));

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
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

function renderSidebar(user: PublicUser) {
  return render(
    <GeoProvider>
      <Sidebar user={user} onLogout={vi.fn()} />
    </GeoProvider>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows the ACHETEUR nav (Produits proches, Ma demande) for a buyer", () => {
    renderSidebar(makeUser({ role: "ACHETEUR" }));

    expect(screen.getByRole("link", { name: "Produits proches" })).toHaveAttribute(
      "href",
      "/produits",
    );
    expect(screen.getByRole("link", { name: /Ma demande/ })).toHaveAttribute("href", "/demande");
    expect(screen.queryByText("Mon catalogue")).not.toBeInTheDocument();
    expect(screen.queryByText("Demandes reçues")).not.toBeInTheDocument();
  });

  it("shows the VENDEUR nav (Mon catalogue + Demandes reçues inert « bientôt ») for a seller", () => {
    renderSidebar(makeUser({ role: "VENDEUR" }));

    const catalogueLink = screen.getByRole("link", { name: "Mon catalogue" });
    expect(catalogueLink).toHaveAttribute("href", "/vendeur/catalogue");
    expect(catalogueLink).toHaveAttribute("aria-current", "page");

    expect(screen.queryByRole("link", { name: "Produits proches" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ma demande/ })).not.toBeInTheDocument();

    const demandesRecues = screen.getByText("Demandes reçues");
    expect(demandesRecues.closest("[aria-disabled='true']")).toBeInTheDocument();
    expect(screen.getByText("bientôt")).toBeInTheDocument();
    // Not a link : no navigation is wired yet (T17b).
    expect(screen.queryByRole("link", { name: /Demandes reçues/ })).not.toBeInTheDocument();
  });
});
