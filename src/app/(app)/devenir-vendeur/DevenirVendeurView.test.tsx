import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PublicUser } from "@/lib/auth/types";

import { DevenirVendeurView } from "./DevenirVendeurView";

const { pushMock, useAuthMock, devenirVendeurMock, refreshAuthMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  useAuthMock: vi.fn(),
  devenirVendeurMock: vi.fn(),
  refreshAuthMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock partiel : useAuth() et devenirVendeur() sont contrôlés par le test,
// describeDevenirVendeurFormError (mapping de codes) reste l'implémentation
// réelle — c'est justement ce que les tests d'erreurs vérifient.
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, useAuth: useAuthMock, devenirVendeur: devenirVendeurMock };
});

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
    vendeurValide: true,
    autoriseAdminPublication: false,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

function renderView(user: PublicUser) {
  useAuthMock.mockReturnValue({
    user,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: refreshAuthMock,
  });
  return render(<DevenirVendeurView />);
}

describe("DevenirVendeurView", () => {
  beforeEach(() => {
    pushMock.mockClear();
    useAuthMock.mockReset();
    devenirVendeurMock.mockReset();
    refreshAuthMock.mockReset();
  });

  it("does not ask for a phone number when the account already has one", async () => {
    const user = userEvent.setup();
    renderView(makeUser({ telephone: "+224622000000" }));

    await user.click(screen.getByRole("button", { name: "Devenir vendeur" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).queryByLabelText(/numéro de téléphone/i)).not.toBeInTheDocument();
  });

  it("asks for a phone number when the account has none", async () => {
    const user = userEvent.setup();
    renderView(makeUser({ telephone: null }));

    await user.click(screen.getByRole("button", { name: "Devenir vendeur" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByLabelText(/numéro de téléphone/i)).toBeInTheDocument();
  });

  it("opens a confirmation dialog before calling the API, naming the consequence", async () => {
    const user = userEvent.setup();
    renderView(makeUser({ telephone: "+224622000000" }));

    await user.click(screen.getByRole("button", { name: "Devenir vendeur" }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent(/espace vendeur/);
    expect(dialog).toHaveTextContent(/administrateur aura validé/);
    expect(devenirVendeurMock).not.toHaveBeenCalled();
  });

  it("does not call the API when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderView(makeUser({ telephone: "+224622000000" }));

    await user.click(screen.getByRole("button", { name: "Devenir vendeur" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(devenirVendeurMock).not.toHaveBeenCalled();
  });

  it("on confirm, calls the API, refreshes the session, then redirects to /dashboard", async () => {
    const user = userEvent.setup();
    devenirVendeurMock.mockResolvedValueOnce(makeUser({ role: "VENDEUR", vendeurValide: false }));
    renderView(makeUser({ telephone: "+224622000000" }));

    await user.click(screen.getByRole("button", { name: "Devenir vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Devenir vendeur" }));

    await waitFor(() => expect(devenirVendeurMock).toHaveBeenCalledWith(undefined));
    await waitFor(() => expect(refreshAuthMock).toHaveBeenCalled());
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sends the entered phone number when the account has none", async () => {
    const user = userEvent.setup();
    devenirVendeurMock.mockResolvedValueOnce(
      makeUser({ role: "VENDEUR", telephone: "+224677000001", vendeurValide: false }),
    );
    renderView(makeUser({ telephone: null }));

    await user.click(screen.getByRole("button", { name: "Devenir vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/numéro de téléphone/i), "+224677000001");
    await user.click(within(dialog).getByRole("button", { name: "Devenir vendeur" }));

    await waitFor(() => expect(devenirVendeurMock).toHaveBeenCalledWith("+224677000001"));
  });

  it("requires a phone number client-side and keeps the dialog open without calling the API", async () => {
    const user = userEvent.setup();
    renderView(makeUser({ telephone: null }));

    await user.click(screen.getByRole("button", { name: "Devenir vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Devenir vendeur" }));

    expect(
      await within(dialog).findByText("Un numéro de téléphone est requis pour devenir vendeur."),
    ).toBeInTheDocument();
    expect(devenirVendeurMock).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("maps PHONE_REQUIRED to the phone field and keeps the dialog open", async () => {
    const user = userEvent.setup();
    devenirVendeurMock.mockRejectedValueOnce(
      new ApiError(400, "Un numéro de téléphone est requis", "PHONE_REQUIRED"),
    );
    renderView(makeUser({ telephone: null }));

    await user.click(screen.getByRole("button", { name: "Devenir vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/numéro de téléphone/i), "+224677000001");
    await user.click(within(dialog).getByRole("button", { name: "Devenir vendeur" }));

    expect(
      await within(dialog).findByText("Un numéro de téléphone est requis pour devenir vendeur."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(refreshAuthMock).not.toHaveBeenCalled();
  });

  it("maps PHONE_ALREADY_USED to the phone field and keeps the dialog open", async () => {
    const user = userEvent.setup();
    devenirVendeurMock.mockRejectedValueOnce(
      new ApiError(409, "Ce numéro est déjà utilisé", "PHONE_ALREADY_USED"),
    );
    renderView(makeUser({ telephone: null }));

    await user.click(screen.getByRole("button", { name: "Devenir vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/numéro de téléphone/i), "+224677000001");
    await user.click(within(dialog).getByRole("button", { name: "Devenir vendeur" }));

    expect(
      await within(dialog).findByText("Ce numéro de téléphone est déjà utilisé par un autre compte."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("maps ALREADY_VENDOR to a general error, closing the dialog", async () => {
    const user = userEvent.setup();
    devenirVendeurMock.mockRejectedValueOnce(
      new ApiError(409, "Déjà vendeur", "ALREADY_VENDOR"),
    );
    renderView(makeUser({ telephone: "+224622000000" }));

    await user.click(screen.getByRole("button", { name: "Devenir vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Devenir vendeur" }));

    expect(await screen.findByText("Ton compte est déjà un compte vendeur.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("maps ROLE_NOT_ELIGIBLE to a general error, closing the dialog", async () => {
    const user = userEvent.setup();
    devenirVendeurMock.mockRejectedValueOnce(
      new ApiError(403, "Rôle non éligible", "ROLE_NOT_ELIGIBLE"),
    );
    renderView(makeUser({ telephone: "+224622000000" }));

    await user.click(screen.getByRole("button", { name: "Devenir vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Devenir vendeur" }));

    expect(
      await screen.findByText("Seul un compte acheteur peut devenir vendeur."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
