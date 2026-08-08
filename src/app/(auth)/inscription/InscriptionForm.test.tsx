import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, getApiBaseUrl } from "@/lib/api";
import { AuthProvider, resetSession } from "@/lib/auth";
import type { PublicUser } from "@/lib/auth/types";

import { InscriptionForm } from "./InscriptionForm";

type FetchMock = ReturnType<typeof vi.fn>;

const { pushMock, replaceMock, refreshSessionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  refreshSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
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

function renderForm() {
  return render(
    <AuthProvider>
      <InscriptionForm />
    </AuthProvider>,
  );
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "fatoumata@exemple.gn");
  await user.type(screen.getByLabelText("Mot de passe"), "secret123");
  await user.type(screen.getByLabelText("Confirmer le mot de passe"), "secret123");
  await user.type(screen.getByLabelText("Nom affiché"), "Fatoumata Bangoura");
}

describe("InscriptionForm", () => {
  beforeEach(() => {
    resetSession();
    vi.stubGlobal("fetch", vi.fn());
    pushMock.mockClear();
    replaceMock.mockClear();
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

    renderForm();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows a 'Continuer avec Google' link pointing at GET /auth/google", () => {
    renderForm();

    const link = screen.getByRole("link", { name: /continuer avec google/i });
    expect(link).toHaveAttribute("href", `${getApiBaseUrl()}/auth/google`);
  });

  it("registers as ACHETEUR by default (telephone optional) and redirects to /verification?email=… on success", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ user: { id: "u1" }, message: "Compte créé." }),
    );

    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/verification?email=fatoumata%40exemple.gn"),
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/register");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      nom: "Fatoumata Bangoura",
      email: "fatoumata@exemple.gn",
      motDePasse: "secret123",
      role: "ACHETEUR",
    });
    expect(body.telephone).toBeUndefined();
  });

  it("marks the phone field required and adds the contact-channel hint when 'Devenir vendeur' is selected", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ user: { id: "u1" }, message: "Compte créé." }),
    );

    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole("radio", { name: "Devenir vendeur" }));

    const phoneField = screen.getByLabelText("Numéro de téléphone");
    expect(phoneField).toBeRequired();
    expect(
      screen.getByText("Ton numéro sera visible par les acheteurs pour te contacter."),
    ).toBeInTheDocument();

    await user.type(phoneField, "+224622000000");
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      role: "VENDEUR",
      telephone: "+224622000000",
    });
  });

  it("does not submit when 'Devenir vendeur' is selected and the phone number is left blank", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;

    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole("radio", { name: "Devenir vendeur" }));
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a dedicated message on VENDOR_PHONE_REQUIRED (400)", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          code: "VENDOR_PHONE_REQUIRED",
          message:
            "Un numéro de téléphone est obligatoire pour un compte vendeur : c'est votre canal de contact avec les acheteurs",
        },
        { ok: false, status: 400 },
      ),
    );

    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole("radio", { name: "Devenir vendeur" }));
    await user.type(screen.getByLabelText("Numéro de téléphone"), "+224622000000");
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Un numéro de téléphone est obligatoire pour un compte vendeur",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a dedicated message when the email is already used (409)", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "EMAIL_ALREADY_USED", message: "Cet email est déjà utilisé" },
        { ok: false, status: 409 },
      ),
    );

    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Cet email est déjà utilisé.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("toggles the password field between masked and visible via the eye button", async () => {
    const user = userEvent.setup();

    renderForm();
    const passwordField = screen.getByLabelText("Mot de passe");
    // Deux champs mot de passe sont présents simultanément (Mot de passe +
    // confirmation) : on cible le bouton de bascule propre à ce champ.
    const toggle = within(passwordField.parentElement as HTMLElement).getByRole("button");

    expect(passwordField).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("aria-label", "Afficher le mot de passe");

    await user.click(toggle);

    expect(passwordField).toHaveAttribute("type", "text");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAttribute("aria-label", "Masquer le mot de passe");

    await user.click(toggle);

    expect(passwordField).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("aria-label", "Afficher le mot de passe");
  });

  it("blocks submission with a per-field error when the passwords do not match, without calling the API", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;

    renderForm();
    await user.type(screen.getByLabelText("Email"), "fatoumata@exemple.gn");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.type(screen.getByLabelText("Confirmer le mot de passe"), "autreChose123");
    await user.type(screen.getByLabelText("Nom affiché"), "Fatoumata Bangoura");
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    expect(
      await screen.findByText("Les mots de passe ne correspondent pas."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a dedicated message when the phone number is already used (409)", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "PHONE_ALREADY_USED", message: "Ce numéro de téléphone est déjà utilisé" },
        { ok: false, status: 409 },
      ),
    );

    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole("radio", { name: "Devenir vendeur" }));
    await user.type(screen.getByLabelText("Numéro de téléphone"), "+224622000000");
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ce numéro de téléphone est déjà utilisé.",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
