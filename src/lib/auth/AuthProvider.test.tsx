import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { getToken } from "@/lib/auth/token";
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
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.nom : "none"}</span>
      <button onClick={() => void login("+224622000000", "secret")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts logged out with loading resolved to false when no token is stored", async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    // No stored token: GET /auth/me must not have been called.
    expect(fetch).not.toHaveBeenCalled();
  });

  it("restores the session from a token already in localStorage", async () => {
    window.localStorage.setItem("makinum.accessToken", "existing-token");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse(DEMO_USER));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent(DEMO_USER.nom));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/me");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer existing-token");
  });

  it("clears the session when restoring an invalid/expired token", async () => {
    window.localStorage.setItem("makinum.accessToken", "stale-token");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: "UNAUTHORIZED", message: "invalide" }, { ok: false, status: 401 }),
    );

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(getToken()).toBeNull();
  });

  it("login() stores the access token and exposes the returned user", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ accessToken: "fresh-token", user: DEMO_USER }),
    );

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await user.click(screen.getByText("login"));

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent(DEMO_USER.nom));
    expect(getToken()).toBe("fresh-token");

    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    expect(url).toContain("/auth/login");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      identifiant: "+224622000000",
      motDePasse: "secret",
    });
  });

  it("logout() clears the token and the in-memory user", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ accessToken: "fresh-token", user: DEMO_USER }),
    );

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await user.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent(DEMO_USER.nom));

    await user.click(screen.getByText("logout"));

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(getToken()).toBeNull();
  });
});
