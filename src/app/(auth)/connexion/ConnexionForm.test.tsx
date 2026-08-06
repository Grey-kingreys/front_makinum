import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/lib/auth";
import type { PublicUser } from "@/lib/auth/types";

import { ConnexionForm } from "./ConnexionForm";

type FetchMock = ReturnType<typeof vi.fn>;

const { pushMock, replaceMock, useSearchParamsMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: useSearchParamsMock,
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
  email: "fatoumata@exemple.gn",
  emailVerifie: true,
  role: "ACHETEUR",
  statutVendeur: "LIBRE",
  statutCompte: "ACTIF",
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
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
    pushMock.mockClear();
    replaceMock.mockClear();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects an already-authenticated user straight to /dashboard", async () => {
    window.localStorage.setItem("makinum.accessToken", "existing-token");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse(DEMO_USER));

    renderPage();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });

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

  it("shows a success banner when redirected from /recuperation", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("recupere=1"));

    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Mot de passe mis à jour");
  });
});
