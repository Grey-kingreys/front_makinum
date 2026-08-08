import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getApiBaseUrl } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { getAccessToken, resetSession } from "@/lib/auth/session";
import type { PublicUser } from "@/lib/auth/types";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function unauthorized(code = "INVALID_REFRESH_TOKEN"): Response {
  return jsonResponse({ code, message: "Session expirée" }, { ok: false, status: 401 });
}

function pathOf(url: unknown): string {
  return String(url).replace(getApiBaseUrl(), "");
}

const DEMO_USER: PublicUser = {
  id: "u1",
  nom: "Fatoumata Bangoura",
  telephone: "+224622000000",
  telephoneVerifie: true,
  email: null,
  emailVerifie: false,
  role: "VENDEUR",
  statutVendeur: "VERIFIE",
  statutCompte: "ACTIF",
  vendeurValide: true,
  latitude: null,
  longitude: null,
};

function Harness() {
  const { user, loading, login, logout, refresh } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.nom : "none"}</span>
      <button onClick={() => void login("+224622000000", "secret")}>login</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => void refresh()}>me</button>
    </div>
  );
}

function renderHarness() {
  return render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    resetSession();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSession();
  });

  it("tente POST /auth/refresh au montage et reste déconnecté sans erreur sur 401", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValue(unauthorized());

    renderHarness();

    // L'état de chargement protège les gardes de route pendant l'aller-retour.
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(getAccessToken()).toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(pathOf(url)).toBe("/auth/refresh");
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBe("include");
  });

  it("restaure la session au montage à partir du cookie de rafraîchissement", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ accessToken: "restored-token", user: DEMO_USER }),
    );

    renderHarness();

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent(DEMO_USER.nom));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(getAccessToken()).toBe("restored-token");
  });

  it("login() garde le jeton en mémoire seule et expose l'utilisateur renvoyé", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockImplementation(async (url: unknown) =>
      pathOf(url) === "/auth/login"
        ? jsonResponse({ accessToken: "fresh-token", user: DEMO_USER })
        : unauthorized(),
    );

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await user.click(screen.getByText("login"));

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent(DEMO_USER.nom));
    expect(getAccessToken()).toBe("fresh-token");

    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    expect(pathOf(url)).toBe("/auth/login");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({
      identifiant: "+224622000000",
      motDePasse: "secret",
    });
  });

  it("logout() appelle POST /auth/logout et vide l'état mémoire", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockImplementation(async (url: unknown) => {
      const path = pathOf(url);
      if (path === "/auth/login") return jsonResponse({ accessToken: "fresh-token", user: DEMO_USER });
      if (path === "/auth/logout") return jsonResponse({ message: "Déconnecté" });
      return unauthorized();
    });

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await user.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent(DEMO_USER.nom));

    await user.click(screen.getByText("logout"));

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(getAccessToken()).toBeNull();
    await waitFor(() => {
      const logoutCall = (fetchMock.mock.calls as [string, RequestInit][]).find(
        ([url]) => pathOf(url) === "/auth/logout",
      );
      expect(logoutCall).toBeDefined();
      expect(logoutCall?.[1].method).toBe("POST");
      // La révocation part avec le jeton encore en mémoire.
      expect((logoutCall?.[1].headers as Headers).get("Authorization")).toBe("Bearer fresh-token");
    });
  });

  it("n'attend pas le réseau pour se déconnecter localement si POST /auth/logout échoue", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockImplementation(async (url: unknown) => {
      const path = pathOf(url);
      if (path === "/auth/login") return jsonResponse({ accessToken: "fresh-token", user: DEMO_USER });
      if (path === "/auth/logout") throw new TypeError("Failed to fetch");
      return unauthorized();
    });

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await user.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent(DEMO_USER.nom));

    await user.click(screen.getByText("logout"));

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(getAccessToken()).toBeNull();
  });

  it("bascule en déconnecté quand un rafraîchissement échoue en cours de session", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    let refreshCalls = 0;
    fetchMock.mockImplementation(async (url: unknown) => {
      const path = pathOf(url);
      if (path === "/auth/refresh") {
        refreshCalls += 1;
        // Restauration au montage OK, puis le cookie est révoqué.
        return refreshCalls === 1
          ? jsonResponse({ accessToken: "restored-token", user: DEMO_USER })
          : unauthorized();
      }
      // Le jeton d'accès (10 min) a expiré : GET /auth/me répond 401.
      return unauthorized("UNAUTHORIZED");
    });

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent(DEMO_USER.nom));

    await user.click(screen.getByText("me"));

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
    expect(getAccessToken()).toBeNull();
    expect(refreshCalls).toBe(2);
  });
});
