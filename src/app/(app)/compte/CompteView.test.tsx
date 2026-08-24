import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PublicUser } from "@/lib/auth/types";

import { CompteView } from "./CompteView";

const { useAuthMock, updateMeMock, applyUpdatedUserMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  updateMeMock: vi.fn(),
  applyUpdatedUserMock: vi.fn(),
}));

// Mock partiel : useAuth()/updateMe() sont contrôlés par le test,
// describeUpdateMeFormError (mapping de codes) reste l'implémentation
// réelle — c'est justement ce que les tests d'erreurs vérifient (même
// convention que DevenirVendeurView.test.tsx).
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, useAuth: useAuthMock, updateMe: updateMeMock };
});

function makeUser(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
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
    autoriseAdminPublication: false,
    latitude: null,
    longitude: null,
    lieuVente: null,
    ...overrides,
  };
}

function renderView(user: PublicUser) {
  useAuthMock.mockReturnValue({
    user,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    applyUpdatedUser: applyUpdatedUserMock,
  });
  return render(<CompteView />);
}

describe("CompteView", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    updateMeMock.mockReset();
    applyUpdatedUserMock.mockReset();
  });

  it("pre-fills the nom/téléphone/email fields from the current user", () => {
    renderView(makeUser({ nom: "Mamadou Diallo", telephone: "+224677000001" }));

    expect(screen.getByLabelText("Nom")).toHaveValue("Mamadou Diallo");
    expect(screen.getByLabelText("Numéro de téléphone")).toHaveValue("+224677000001");
    expect(screen.getByLabelText("Email")).toHaveValue("fatoumata@exemple.gn");
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByText("L'email ne peut pas être modifié pour l'instant.")).toBeInTheDocument();
  });

  it("shows the VENDEUR-specific phone hint", () => {
    renderView(makeUser({ role: "VENDEUR" }));

    expect(
      screen.getByText("Visible par les acheteurs — c'est ton canal de contact."),
    ).toBeInTheDocument();
  });

  it("shows the generic phone hint for a non-VENDEUR", () => {
    renderView(makeUser({ role: "ACHETEUR" }));

    expect(screen.getByText("Optionnel — sert de canal de contact si tu vends.")).toBeInTheDocument();
  });

  it("disables the Enregistrer button until a field is actually changed", async () => {
    const user = userEvent.setup();
    renderView(makeUser());

    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

    await user.type(screen.getByLabelText("Nom"), " ");
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

    await user.clear(screen.getByLabelText("Nom"));
    await user.type(screen.getByLabelText("Nom"), "Nouveau Nom");
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  });

  it("sends only the changed field (nom) and adopts the updated user without an accessToken", async () => {
    const user = userEvent.setup();
    const updated = makeUser({ nom: "Nouveau Nom" });
    updateMeMock.mockResolvedValueOnce({ user: updated });
    renderView(makeUser());

    await user.clear(screen.getByLabelText("Nom"));
    await user.type(screen.getByLabelText("Nom"), "Nouveau Nom");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(updateMeMock).toHaveBeenCalledWith({ nom: "Nouveau Nom" }));
    await waitFor(() => expect(applyUpdatedUserMock).toHaveBeenCalledWith(updated));
    expect(await screen.findByText("Modifications enregistrées.")).toBeInTheDocument();
  });

  it("sends telephone: null when a non-VENDEUR clears the phone field (retrait)", async () => {
    const user = userEvent.setup();
    const updated = makeUser({ telephone: null });
    updateMeMock.mockResolvedValueOnce({ user: updated });
    renderView(makeUser({ role: "ACHETEUR", telephone: "+224622000000" }));

    await user.clear(screen.getByLabelText("Numéro de téléphone"));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(updateMeMock).toHaveBeenCalledWith({ telephone: null }));
  });

  it("maps PHONE_ALREADY_USED (409) to the phone field", async () => {
    const user = userEvent.setup();
    updateMeMock.mockRejectedValueOnce(
      new ApiError(409, "Déjà utilisé", "PHONE_ALREADY_USED"),
    );
    renderView(makeUser());

    await user.clear(screen.getByLabelText("Numéro de téléphone"));
    await user.type(screen.getByLabelText("Numéro de téléphone"), "+224677000009");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      await screen.findByText("Ce numéro de téléphone est déjà utilisé par un autre compte."),
    ).toBeInTheDocument();
    expect(applyUpdatedUserMock).not.toHaveBeenCalled();
  });

  it("maps VENDOR_PHONE_REQUIRED to the phone field when a VENDEUR tries to remove their number", async () => {
    const user = userEvent.setup();
    updateMeMock.mockRejectedValueOnce(
      new ApiError(400, "Téléphone requis", "VENDOR_PHONE_REQUIRED"),
    );
    renderView(makeUser({ role: "VENDEUR", telephone: "+224622000000" }));

    await user.clear(screen.getByLabelText("Numéro de téléphone"));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      await screen.findByText(
        "Un numéro de téléphone est obligatoire pour un compte vendeur : c'est ton canal de contact avec les acheteurs.",
      ),
    ).toBeInTheDocument();
  });

  it("maps INVALID_PHONE to the phone field", async () => {
    const user = userEvent.setup();
    updateMeMock.mockRejectedValueOnce(new ApiError(400, "Invalide", "INVALID_PHONE"));
    renderView(makeUser());

    await user.clear(screen.getByLabelText("Numéro de téléphone"));
    await user.type(screen.getByLabelText("Numéro de téléphone"), "abc");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Numéro de téléphone invalide.")).toBeInTheDocument();
  });

  describe("mot de passe", () => {
    // Séquentiel, PAS Promise.all : userEvent.type() simule focus + frappe
    // clavier en pas à pas ; lancer 3 appels concurrents sur des champs
    // différents fait interférer leurs frappes (constaté : valeurs
    // entrelacées entre champs). Un seul « utilisateur » ne tape jamais dans
    // deux champs à la fois.
    async function fillPasswordForm(
      actuel: string,
      nouveau: string,
      confirmation: string,
      user: ReturnType<typeof userEvent.setup>,
    ) {
      await user.type(screen.getByLabelText("Mot de passe actuel"), actuel);
      await user.type(screen.getByLabelText("Nouveau mot de passe"), nouveau);
      await user.type(screen.getByLabelText("Confirmer le nouveau mot de passe"), confirmation);
    }

    it("refuses client-side when the confirmation does not match, without calling the API", async () => {
      const user = userEvent.setup();
      renderView(makeUser());

      await fillPasswordForm("ancien-mdp", "nouveau-mdp-1", "nouveau-mdp-2", user);
      await user.click(screen.getByRole("button", { name: "Changer mon mot de passe" }));

      expect(await screen.findByText("Les mots de passe ne correspondent pas.")).toBeInTheDocument();
      expect(updateMeMock).not.toHaveBeenCalled();
    });

    it("on success, adopts the returned user + accessToken, shows the specific message, and clears the fields", async () => {
      const user = userEvent.setup();
      const updated = makeUser();
      updateMeMock.mockResolvedValueOnce({ user: updated, accessToken: "new-access-token" });
      renderView(makeUser());

      await fillPasswordForm("ancien-mdp", "nouveau-mdp-123", "nouveau-mdp-123", user);
      await user.click(screen.getByRole("button", { name: "Changer mon mot de passe" }));

      await waitFor(() =>
        expect(updateMeMock).toHaveBeenCalledWith({
          motDePasse: { actuel: "ancien-mdp", nouveau: "nouveau-mdp-123" },
        }),
      );
      await waitFor(() =>
        expect(applyUpdatedUserMock).toHaveBeenCalledWith(updated, "new-access-token"),
      );
      expect(
        await screen.findByText("Mot de passe mis à jour. Tes autres appareils ont été déconnectés."),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Mot de passe actuel")).toHaveValue("");
      expect(screen.getByLabelText("Nouveau mot de passe")).toHaveValue("");
      expect(screen.getByLabelText("Confirmer le nouveau mot de passe")).toHaveValue("");
    });

    it("maps INVALID_CURRENT_PASSWORD to the current-password field", async () => {
      const user = userEvent.setup();
      updateMeMock.mockRejectedValueOnce(
        new ApiError(400, "Incorrect", "INVALID_CURRENT_PASSWORD"),
      );
      renderView(makeUser());

      await fillPasswordForm("mauvais-mdp", "nouveau-mdp-123", "nouveau-mdp-123", user);
      await user.click(screen.getByRole("button", { name: "Changer mon mot de passe" }));

      expect(await screen.findByText("Mot de passe actuel incorrect.")).toBeInTheDocument();
      expect(applyUpdatedUserMock).not.toHaveBeenCalled();
    });
  });
});
