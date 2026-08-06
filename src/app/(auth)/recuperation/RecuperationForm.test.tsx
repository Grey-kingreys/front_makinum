import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/lib/auth";
import type { PublicUser } from "@/lib/auth/types";

import { RecuperationForm } from "./RecuperationForm";

type FetchMock = ReturnType<typeof vi.fn>;

const { pushMock, replaceMock } = vi.hoisted(() => ({ pushMock: vi.fn(), replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
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

function renderForm() {
  return render(
    <AuthProvider>
      <RecuperationForm />
    </AuthProvider>,
  );
}

const GENERIC_MESSAGE =
  "Si un compte correspond à cet identifiant, un code de vérification vient d'être envoyé.";

async function goToStepTwo(user: ReturnType<typeof userEvent.setup>, fetchMock: FetchMock) {
  fetchMock.mockResolvedValueOnce(jsonResponse({ message: GENERIC_MESSAGE }));
  await user.type(screen.getByLabelText("Email"), "fatoumata@exemple.gn");
  await user.click(screen.getByRole("button", { name: "Recevoir le code" }));
  await screen.findByLabelText("Code reçu");
}

describe("RecuperationForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects an already-authenticated user straight to /dashboard", async () => {
    window.localStorage.setItem("makinum.accessToken", "existing-token");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse(DEMO_USER));

    renderForm();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("step 1: requests recovery and always shows the neutral message, moving to step 2", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;

    renderForm();
    await goToStepTwo(user, fetchMock);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/recovery/request");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ identifiant: "fatoumata@exemple.gn" });

    expect(screen.getByRole("status")).toHaveTextContent(GENERIC_MESSAGE);
    expect(screen.getByLabelText("Nouveau mot de passe")).toBeInTheDocument();
  });

  it("step 1: stops on RATE_LIMITED without advancing to step 2", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "RATE_LIMITED", message: "Trop de tentatives. Réessayez plus tard." },
        { ok: false, status: 429 },
      ),
    );

    renderForm();
    await user.type(screen.getByLabelText("Email"), "fatoumata@exemple.gn");
    await user.click(screen.getByRole("button", { name: "Recevoir le code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Trop de tentatives, réessaie dans un moment.",
    );
    expect(screen.queryByLabelText("Code reçu")).not.toBeInTheDocument();
  });

  it("step 2: resets the password with identifiant + code, then redirects to /connexion", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;

    renderForm();
    await goToStepTwo(user, fetchMock);

    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Mot de passe réinitialisé" }));
    await user.type(screen.getByLabelText("Code reçu"), "654321");
    await user.type(screen.getByLabelText("Nouveau mot de passe"), "nouveauSecret123");
    await user.click(screen.getByRole("button", { name: "Réinitialiser le mot de passe" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/connexion?recupere=1"));

    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toContain("/auth/recovery/reset");
    expect(JSON.parse(init.body as string)).toEqual({
      identifiant: "fatoumata@exemple.gn",
      code: "654321",
      nouveauMotDePasse: "nouveauSecret123",
    });
  });

  it("step 2: shows INVALID_OTP as a proper error message", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;

    renderForm();
    await goToStepTwo(user, fetchMock);

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: "INVALID_OTP", message: "Code invalide ou expiré" }, { ok: false, status: 400 }),
    );
    await user.type(screen.getByLabelText("Code reçu"), "000000");
    await user.type(screen.getByLabelText("Nouveau mot de passe"), "nouveauSecret123");
    await user.click(screen.getByRole("button", { name: "Réinitialiser le mot de passe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Code invalide ou expiré.");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
