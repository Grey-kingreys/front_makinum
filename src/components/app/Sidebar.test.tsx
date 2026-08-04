import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GeoProvider } from "@/lib/geo";
import { NotificationsProvider } from "@/lib/notifications";
import { DemandesProvider } from "@/lib/purchase-requests";
import type { PublicUser } from "@/lib/auth/types";
import type { PurchaseRequestView } from "@/lib/purchase-requests/types";

import { Sidebar } from "./Sidebar";

const { usePathnameMock, pushMock, listPurchaseRequestsMock, listNotificationsMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/vendeur/catalogue"),
  pushMock: vi.fn(),
  listPurchaseRequestsMock: vi.fn(),
  listNotificationsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  // Sidebar renders <SearchField>, which also calls useRouter().
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/purchase-requests/api", () => ({
  listPurchaseRequests: listPurchaseRequestsMock,
}));

vi.mock("@/lib/notifications/api", () => ({
  listNotifications: listNotificationsMock,
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

function makeDemande(overrides: Partial<PurchaseRequestView> = {}): PurchaseRequestView {
  return {
    id: "d1",
    statut: "EN_COURS",
    resultat: null,
    acheteurId: "u1",
    vendeurId: "v1",
    dateCreation: "2026-08-01T00:00:00.000Z",
    dateMiseAJour: "2026-08-01T00:00:00.000Z",
    items: [],
    interlocuteur: { id: "v1", nom: "Fatoumata", statutVendeur: "VERIFIE" },
    ...overrides,
  };
}

async function renderSidebar(user: PublicUser) {
  const utils = render(
    <GeoProvider>
      <DemandesProvider>
        <NotificationsProvider>
          <Sidebar user={user} onLogout={vi.fn()} />
        </NotificationsProvider>
      </DemandesProvider>
    </GeoProvider>,
  );
  // Laisse les fetchs initiaux de DemandesProvider/NotificationsProvider se résoudre.
  await waitFor(() => expect(listPurchaseRequestsMock).toHaveBeenCalled());
  await waitFor(() => expect(listNotificationsMock).toHaveBeenCalled());
  return utils;
}

describe("Sidebar", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    listPurchaseRequestsMock.mockReset();
    listPurchaseRequestsMock.mockResolvedValue([]);
    listNotificationsMock.mockReset();
    listNotificationsMock.mockResolvedValue({ items: [], total: 0, nbNonLues: 0 });
  });

  it("shows the ACHETEUR nav (Produits proches, Ma demande) for a buyer", async () => {
    await renderSidebar(makeUser({ role: "ACHETEUR" }));

    expect(screen.getByRole("link", { name: "Produits proches" })).toHaveAttribute(
      "href",
      "/produits",
    );
    expect(screen.getByRole("link", { name: /Ma demande/ })).toHaveAttribute("href", "/demandes");
    expect(screen.queryByText("Mon catalogue")).not.toBeInTheDocument();
    expect(screen.queryByText("Demandes reçues")).not.toBeInTheDocument();
  });

  it("shows the VENDEUR nav (Mon catalogue + Demandes reçues inert « bientôt ») for a seller", async () => {
    await renderSidebar(makeUser({ role: "VENDEUR" }));

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

  it("hides the badge on « Ma demande » when there are no EN_COURS drafts", async () => {
    listPurchaseRequestsMock.mockResolvedValue([makeDemande({ id: "d1", statut: "ENVOYEE" })]);
    await renderSidebar(makeUser({ role: "ACHETEUR" }));

    const link = await screen.findByRole("link", { name: /Ma demande/ });
    expect(link.textContent).toBe("Ma demande");
  });

  it("shows the ADMIN nav (File de modération, Vendeurs) for an admin", async () => {
    await renderSidebar(makeUser({ role: "ADMIN" }));

    expect(screen.getByRole("link", { name: "File de modération" })).toHaveAttribute(
      "href",
      "/admin/moderation",
    );
    expect(screen.getByRole("link", { name: "Vendeurs" })).toHaveAttribute("href", "/admin/vendeurs");
    expect(screen.queryByText("Mon catalogue")).not.toBeInTheDocument();
    expect(screen.queryByText("Produits proches")).not.toBeInTheDocument();
    expect(screen.queryByText("Demandes reçues")).not.toBeInTheDocument();
  });

  it("shows the EN_COURS draft count as a badge on « Ma demande »", async () => {
    listPurchaseRequestsMock.mockResolvedValue([
      makeDemande({ id: "d1", statut: "EN_COURS" }),
      makeDemande({ id: "d2", statut: "EN_COURS" }),
      makeDemande({ id: "d3", statut: "ENVOYEE" }),
    ]);
    await renderSidebar(makeUser({ role: "ACHETEUR" }));

    const link = await screen.findByRole("link", { name: /Ma demande/ });
    expect(link).toHaveTextContent("2");
  });
});
