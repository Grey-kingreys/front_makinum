import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, getApiBaseUrl } from "@/lib/api";
import { AuthProvider, resetSession } from "@/lib/auth";
import type { PublicUser } from "@/lib/auth/types";

import { ConnexionForm } from "./ConnexionForm";

type FetchMock = ReturnType<typeof vi.fn>;

const { pushMock, replaceMock, useSearchParamsMock, refreshSessionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
  refreshSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: useSearchParamsMock,
}));

// T28 : l'AuthProvider restaure la session au montage via POST /auth/refresh.
// On neutralise cet appel (visiteur anonyme par défaut) pour que les réponses
// `fetch` moquées dans chaque test restent celles du formulaire lui-même.
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, refreshSession: refreshSessionMock };
});

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
  email: "fatoumata@exemple.gn",
  emailVerifie: true,
  role: "ACHETEUR",
  statutVendeur: "LIBRE",
  statutCompte: "ACTIF",
  vendeurValide: true,
  latitude: null,
  longitude: null,
};

function renderPage() {
  return render(
    <AuthProvider>
      <ConnexionForm />
    </AuthProvider>,
  );
}

describe("ConnexionForm", () => {
  beforeEach(() => {
    resetSession();
    vi.stubGlobal("fetch", vi.fn());
    pushMock.mockClear();
    replaceMock.mockClear();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    refreshSessionMock.mockReset();
    refreshSessionMock.mockRejectedValue(
      new ApiError(401, "Session expirée", "INVALID_REFRESH_TOKEN"),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSession();
  });

  it("redirects an already-authenticated user straight to /dashboard", async () => {
    refreshSessionMock.mockResolvedValueOnce({ accessToken: "restored-token", user: DEMO_USER });

    renderPage();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects an already-authenticated user to ?returnTo= when it is a safe internal path (T51)", async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("returnTo=/produits/p1"));
    refreshSessionMock.mockResolvedValueOnce({ accessToken: "restored-token", user: DEMO_USER });

    renderPage();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/produits/p1"));
  });

  it.each([
    ["https://evil.tld"],
    ["//evil.tld"],
    ["javascript:alert(1)"],
    // Un navigateur normalise `\` en `/` dans la partie chemin d'une URL
    // http/https : ces deux formes se résolvent en https://evil.tld/ malgré
    // le `/` initial (cf. src/lib/auth/return-to.ts, isSafeReturnPath).
    ["/\\evil.tld"],
    ["/\\/evil.tld"],
  ])(
    "falls back to /dashboard for an already-authenticated user when returnTo=%s is unsafe (T51)",
    async (unsafeReturnTo) => {
      useSearchParamsMock.mockReturnValue(new URLSearchParams({ returnTo: unsafeReturnTo }));
      refreshSessionMock.mockResolvedValueOnce({ accessToken: "restored-token", user: DEMO_USER });

      renderPage();

      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    },
  );

  it("submits identifiant/motDePasse, calls login, and redirects to ?returnTo= on success when it is safe (T51)", async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("returnTo=/vendeurs/v1"));
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ accessToken: "fresh-token", user: DEMO_USER }));

    renderPage();

    await user.type(screen.getByLabelText("Email ou numéro vérifié"), "+224622000000");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/vendeurs/v1"));
  });

  it.each([["//evil.tld"], ["/\\evil.tld"], ["/\\/evil.tld"]])(
    "submits identifiant/motDePasse, calls login, and falls back to /dashboard when returnTo=%s is unsafe (T51)",
    async (unsafeReturnTo) => {
      useSearchParamsMock.mockReturnValue(new URLSearchParams({ returnTo: unsafeReturnTo }));
      const user = userEvent.setup();
      const fetchMock = fetch as unknown as FetchMock;
      fetchMock.mockResolvedValueOnce(jsonResponse({ accessToken: "fresh-token", user: DEMO_USER }));

      renderPage();

      await user.type(screen.getByLabelText("Email ou numéro vérifié"), "+224622000000");
      await user.type(screen.getByLabelText("Mot de passe"), "secret123");
      await user.click(screen.getByRole("button", { name: "Se connecter" }));

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    },
  );

  it("submits identifiant/motDePasse, calls login, and redirects to /dashboard on success", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ accessToken: "fresh-token", user: DEMO_USER }));

    renderPage();

    await user.type(screen.getByLabelText("Email ou numéro vérifié"), "+224622000000");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/login");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      identifiant: "+224622000000",
      motDePasse: "secret123",
    });
  });

  it("shows the INVALID_CREDENTIALS message on a failed login", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "INVALID_CREDENTIALS", message: "Identifiant ou mot de passe incorrect" },
        { ok: false, status: 401 },
      ),
    );

    renderPage();

    await user.type(screen.getByLabelText("Email ou numéro vérifié"), "+224622000000");
    await user.type(screen.getByLabelText("Mot de passe"), "wrong");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Identifiant ou mot de passe incorrect",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a link to /verification when the email is not verified (EMAIL_NOT_VERIFIED, 403)", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          code: "EMAIL_NOT_VERIFIED",
          message: "Adresse email non vérifiée : validez le code reçu par email",
        },
        { ok: false, status: 403 },
      ),
    );

    renderPage();

    await user.type(screen.getByLabelText("Email ou numéro vérifié"), "fatoumata@exemple.gn");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Adresse email non vérifiée");
    const verifyLink = screen.getByRole("link", { name: "Vérifier mon email" });
    expect(verifyLink).toHaveAttribute(
      "href",
      "/verification?email=fatoumata%40exemple.gn",
    );
  });

  it("shows the ACCOUNT_SUSPENDED message", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "ACCOUNT_SUSPENDED", message: "Compte suspendu : connexion impossible" },
        { ok: false, status: 403 },
      ),
    );

    renderPage();

    await user.type(screen.getByLabelText("Email ou numéro vérifié"), "+224622000000");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("suspendu");
  });

  it("shows the RATE_LIMITED message", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "RATE_LIMITED", message: "Trop de tentatives. Réessayez plus tard." },
        { ok: false, status: 429 },
      ),
    );

    renderPage();

    await user.type(screen.getByLabelText("Email ou numéro vérifié"), "+224622000000");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Trop de tentatives, réessaie dans un moment.",
    );
  });

  it("toggles the password field between masked and visible via the eye button", async () => {
    const user = userEvent.setup();

    renderPage();
    const passwordField = screen.getByLabelText("Mot de passe");
    const toggle = screen.getByRole("button", { name: "Afficher le mot de passe" });

    expect(passwordField).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(passwordField).toHaveAttribute("type", "text");
    const toggleAfter = screen.getByRole("button", { name: "Masquer le mot de passe" });
    expect(toggleAfter).toHaveAttribute("aria-pressed", "true");

    await user.click(toggleAfter);

    expect(passwordField).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Afficher le mot de passe" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows a 'Continuer avec Google' link pointing at GET /auth/google", () => {
    renderPage();

    const link = screen.getByRole("link", { name: /continuer avec google/i });
    expect(link).toHaveAttribute("href", `${getApiBaseUrl()}/auth/google`);
  });

  it("shows a success banner when redirected from /recuperation", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("recupere=1"));

    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Mot de passe mis à jour");
  });
});
