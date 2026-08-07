import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/lib/auth";
import type { PublicUser } from "@/lib/auth/types";

import { AppShell } from "./AppShell";

type FetchMock = ReturnType<typeof vi.fn>;

const { replaceMock, pushMock, usePathnameMock, listNotificationsMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
  usePathnameMock: vi.fn(() => "/produits"),
  listNotificationsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: usePathnameMock,
}));

// NotificationsProvider (cloche sidebar) mocké au niveau module plutôt que
// via le fetch global : évite toute dépendance à l'ordre d'exécution des
// effets entre DemandesProvider et NotificationsProvider (tous deux montés
// dans le même commit une fois la session restaurée).
vi.mock("@/lib/notifications/api", () => ({
  listNotifications: listNotificationsMock,
}));

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

const DEMO_USER: PublicUser = {
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
};

function renderShell() {
  return render(
    <AuthProvider>
      <AppShell>
        <div>contenu de la page</div>
      </AppShell>
    </AuthProvider>,
  );
}

describe("AppShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
    replaceMock.mockClear();
    pushMock.mockClear();
    usePathnameMock.mockReturnValue("/produits");
    listNotificationsMock.mockReset();
    listNotificationsMock.mockResolvedValue({ items: [], total: 0, nbNonLues: 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /connexion when no session is loaded", async () => {
    renderShell();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/connexion"));
    expect(screen.queryByText("contenu de la page")).not.toBeInTheDocument();
  });

  it("renders the sidebar (active link) and the page content once a session is restored", async () => {
    window.localStorage.setItem("makinum.accessToken", "existing-token");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse(DEMO_USER));
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // GET /demandes?vue=acheteur (DemandesProvider)
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // GET /demandes?vue=vendeur (DemandesRecuesProvider)

    renderShell();

    expect(await screen.findByText("contenu de la page")).toBeInTheDocument();
    const activeLink = screen.getByRole("link", { name: "Produits proches" });
    expect(activeLink).toHaveAttribute("href", "/produits");
    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Ma demande/ })).toHaveAttribute("href", "/demandes");
    expect(screen.getByText(DEMO_USER.nom)).toBeInTheDocument();
    expect(screen.getByText(DEMO_USER.telephone as string)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("logout() clears the session and redirects to the landing page", async () => {
    window.localStorage.setItem("makinum.accessToken", "existing-token");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse(DEMO_USER));
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // GET /demandes?vue=acheteur (DemandesProvider)
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // GET /demandes?vue=vendeur (DemandesRecuesProvider)

    const user = userEvent.setup();
    renderShell();

    await screen.findByText("contenu de la page");
    await user.click(screen.getByText("Se déconnecter"));

    expect(pushMock).toHaveBeenCalledWith("/");
    expect(window.localStorage.getItem("makinum.accessToken")).toBeNull();
  });
});
