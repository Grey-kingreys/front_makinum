import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, getAccessToken, resetSession } from "@/lib/auth";
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
  autoriseAdminPublication: false,
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
    resetSession();
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
    resetSession();
  });

  it("redirects to /connexion when no session is loaded on a protected route (/dashboard)", async () => {
    usePathnameMock.mockReturnValue("/dashboard");
    const fetchMock = fetch as unknown as FetchMock;
    // POST /auth/refresh au montage : pas de cookie valide → visiteur anonyme.
    fetchMock.mockResolvedValue(
      jsonResponse(
        { code: "INVALID_REFRESH_TOKEN", message: "Session expirée" },
        { ok: false, status: 401 },
      ),
    );

    renderShell();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/connexion"));
    expect(screen.queryByText("contenu de la page")).not.toBeInTheDocument();
  });

  it("redirects to /connexion when no session is loaded on /vendeur/catalogue (régression T51)", async () => {
    usePathnameMock.mockReturnValue("/vendeur/catalogue");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValue(
      jsonResponse(
        { code: "INVALID_REFRESH_TOKEN", message: "Session expirée" },
        { ok: false, status: 401 },
      ),
    );

    renderShell();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/connexion"));
    expect(screen.queryByText("contenu de la page")).not.toBeInTheDocument();
  });

  it("renders /produits for an anonymous visitor without redirecting, visitor sidebar shown (T51)", async () => {
    usePathnameMock.mockReturnValue("/produits");
    const fetchMock = fetch as unknown as FetchMock;
    // POST /auth/refresh au montage : pas de cookie valide → visiteur anonyme,
    // /produits est public : pas de redirection, ni de fetch supplémentaire
    // (DemandesProvider/DemandesRecuesProvider/NotificationsProvider ne sont
    // pas montés — sinon 401 silencieux à chaque montage).
    fetchMock.mockResolvedValue(
      jsonResponse(
        { code: "INVALID_REFRESH_TOKEN", message: "Session expirée" },
        { ok: false, status: 401 },
      ),
    );

    renderShell();

    expect(await screen.findByText("contenu de la page")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toBeInTheDocument();
    expect(screen.queryByText("Se déconnecter")).not.toBeInTheDocument();
    expect(listNotificationsMock).not.toHaveBeenCalled();
    expect(
      (fetchMock.mock.calls as [string][]).every(([url]) => !String(url).includes("/demandes")),
    ).toBe(true);
  });

  it("renders a nested public path (/produits/p1) for an anonymous visitor without redirecting (T51)", async () => {
    usePathnameMock.mockReturnValue("/produits/p1");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValue(
      jsonResponse(
        { code: "INVALID_REFRESH_TOKEN", message: "Session expirée" },
        { ok: false, status: 401 },
      ),
    );

    renderShell();

    expect(await screen.findByText("contenu de la page")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders page content synchronously on a public route while the session is still loading (T54 — no empty shell, this is what puts content in the server HTML)", () => {
    usePathnameMock.mockReturnValue("/produits/p1");
    const fetchMock = fetch as unknown as FetchMock;
    // /auth/refresh jamais résolu : simule l'état `loading === true`, le seul
    // état que le serveur puisse jamais rendre (T28 : la session ne peut être
    // tranchée que par un appel réseau, impossible côté serveur).
    fetchMock.mockImplementation(() => new Promise(() => {}));

    renderShell();

    // Assertion synchrone, sans `await` : le contenu doit être présent dès le
    // premier rendu, pas seulement une fois `loading` retombé à `false`.
    expect(screen.getByText("contenu de la page")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se connecter" })).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("keeps the empty shell on a protected route while the session is still loading (T54 non-regression — no private-content leak before the redirect fires)", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockImplementation(() => new Promise(() => {}));

    renderShell();

    expect(screen.queryByText("contenu de la page")).not.toBeInTheDocument();
    // Pas encore de redirection : `loading` est toujours vrai, l'effet de
    // garde n'a pas de verdict à rendre tant que la session n'est pas résolue.
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders the sidebar (active link) and the page content once a session is restored", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ accessToken: "restored-token", user: DEMO_USER }),
    ); // POST /auth/refresh (restauration de session au montage)
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // GET /demandes?vue=acheteur (DemandesProvider)
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // GET /demandes?vue=vendeur (DemandesRecuesProvider)

    renderShell();

    // /produits est public (T54) : le premier rendu est le mode visiteur
    // (`loading` encore vrai), puis un second rendu bascule en mode
    // authentifié une fois la session restaurée — deux commits distincts qui
    // contiennent chacun « contenu de la page » (nœuds DOM différents,
    // texte identique). Attendre un marqueur qui n'existe que dans le rendu
    // authentifié stabilisé avant d'interroger le reste du DOM, pour ne pas
    // interroger une référence dépendante du premier commit, remplacée entre
    // temps par le second.
    await screen.findByText(DEMO_USER.nom);
    expect(screen.getByText("contenu de la page")).toBeInTheDocument();
    const activeLink = screen.getByRole("link", { name: "Produits proches" });
    expect(activeLink).toHaveAttribute("href", "/produits");
    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Ma demande/ })).toHaveAttribute("href", "/demandes");
    expect(screen.getByText(DEMO_USER.nom)).toBeInTheDocument();
    expect(screen.getByText(DEMO_USER.telephone as string)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("logout() clears the session and redirects to the landing page", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ accessToken: "restored-token", user: DEMO_USER }),
    ); // POST /auth/refresh (restauration de session au montage)
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // GET /demandes?vue=acheteur (DemandesProvider)
    fetchMock.mockResolvedValueOnce(jsonResponse([])); // GET /demandes?vue=vendeur (DemandesRecuesProvider)
    fetchMock.mockResolvedValue(jsonResponse({ message: "Déconnecté" })); // POST /auth/logout

    const user = userEvent.setup();
    renderShell();

    // Attendre le rendu authentifié stabilisé (même raison que le test
    // précédent — /produits est public, T54, deux commits successifs) avant
    // d'interagir avec un élément qui n'existe que dans ce mode.
    await screen.findByText("Se déconnecter");
    await user.click(screen.getByText("Se déconnecter"));

    expect(pushMock).toHaveBeenCalledWith("/");
    expect(getAccessToken()).toBeNull();
    await waitFor(() =>
      expect(
        (fetchMock.mock.calls as [string][]).some(([url]) => String(url).endsWith("/auth/logout")),
      ).toBe(true),
    );
  });
});
