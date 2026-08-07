import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminUserView } from "@/lib/admin";
import type { PublicUser } from "@/lib/auth/types";

import { VendeursView } from "./VendeursView";

const { listAdminUsersMock, updateAdminUserMock, useAuthMock, useSearchParamsMock } = vi.hoisted(() => ({
  listAdminUsersMock: vi.fn(),
  updateAdminUserMock: vi.fn(),
  useAuthMock: vi.fn(),
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/lib/admin/api", () => ({
  listAdminUsers: listAdminUsersMock,
  updateAdminUser: updateAdminUserMock,
}));

vi.mock("@/lib/auth", () => ({ useAuth: useAuthMock }));

vi.mock("next/navigation", () => ({
  useSearchParams: useSearchParamsMock,
}));

function makeAdmin(): PublicUser {
  return {
    id: "admin-1",
    nom: "Ousmane Keïta",
    telephone: "+224622999999",
    telephoneVerifie: true,
    email: null,
    emailVerifie: false,
    role: "ADMIN",
    statutVendeur: "LIBRE",
    statutCompte: "ACTIF",
    vendeurValide: true,
    latitude: null,
    longitude: null,
  };
}

function makeUser(overrides: Partial<AdminUserView> = {}): AdminUserView {
  return {
    id: "v1",
    nom: "Fatoumata Bangoura",
    telephone: "+224622111111",
    telephoneVerifie: true,
    email: null,
    emailVerifie: false,
    role: "VENDEUR",
    statutVendeur: "LIBRE",
    statutCompte: "ACTIF",
    // Vendeur déjà validé par défaut — les tests dédiés à T30 (filtre, bouton
    // « Valider ») surchargent explicitement `vendeurValide: false`.
    vendeurValide: true,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

describe("VendeursView", () => {
  beforeEach(() => {
    listAdminUsersMock.mockReset();
    updateAdminUserMock.mockReset();
    listAdminUsersMock.mockResolvedValue({ items: [makeUser()], total: 1, page: 1, limit: 20 });
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: makeAdmin(), loading: false, login: vi.fn(), logout: vi.fn(), refresh: vi.fn() });
    useSearchParamsMock.mockReset();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders each row — nom, téléphone, rôle, statut compte and statut vendeur badges", async () => {
    render(<VendeursView />);

    expect(await screen.findByText("Fatoumata Bangoura")).toBeInTheDocument();
    expect(screen.getByText("+224622111111")).toBeInTheDocument();
    expect(screen.getByText("Vendeur", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("actif")).toBeInTheDocument();
    expect(screen.getByText("Libre", { selector: "span" })).toBeInTheDocument();
    expect(listAdminUsersMock).toHaveBeenCalledWith({
      q: undefined,
      role: undefined,
      statutCompte: undefined,
      statutVendeur: undefined,
      page: 1,
      limit: 20,
    });
  });

  it("does not re-fetch while typing — only when the search form is submitted", async () => {
    const user = userEvent.setup();
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");
    listAdminUsersMock.mockClear();

    await user.type(screen.getByLabelText("Recherche"), "Fatou");
    expect(listAdminUsersMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Rechercher" }));
    await waitFor(() =>
      expect(listAdminUsersMock).toHaveBeenCalledWith(
        expect.objectContaining({ q: "Fatou" }),
      ),
    );
  });

  it("re-fetches with the selected role filter", async () => {
    const user = userEvent.setup();
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");
    listAdminUsersMock.mockClear();

    await user.selectOptions(screen.getByLabelText("Rôle"), "VENDEUR");

    await waitFor(() =>
      expect(listAdminUsersMock).toHaveBeenCalledWith(expect.objectContaining({ role: "VENDEUR" })),
    );
  });

  it("attributes a trust level — PATCH { statutVendeur: VERIFIE }", async () => {
    const user = userEvent.setup();
    updateAdminUserMock.mockResolvedValueOnce(makeUser({ statutVendeur: "VERIFIE" }));
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Vérifié" }));

    await waitFor(() =>
      expect(updateAdminUserMock).toHaveBeenCalledWith("v1", { statutVendeur: "VERIFIE" }),
    );
  });

  it("opens a confirmation dialog before suspending, mentioning the catalogue cascade for a VENDEUR, then PATCHes statutCompte on confirm", async () => {
    const user = userEvent.setup();
    updateAdminUserMock.mockResolvedValueOnce(makeUser({ statutCompte: "SUSPENDU" }));
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Suspendre" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/catalogue sera désactivé/);
    expect(updateAdminUserMock).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Suspendre" }));

    await waitFor(() =>
      expect(updateAdminUserMock).toHaveBeenCalledWith("v1", { statutCompte: "SUSPENDU" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not call the API when the suspend confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Suspendre" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(updateAdminUserMock).not.toHaveBeenCalled();
  });

  it("closes the confirmation dialog on Escape without calling the API", async () => {
    const user = userEvent.setup();
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Suspendre" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(updateAdminUserMock).not.toHaveBeenCalled();
  });

  it("reactivates a suspended account after confirmation", async () => {
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ statutCompte: "SUSPENDU" })],
      total: 1,
      page: 1,
      limit: 20,
    });
    updateAdminUserMock.mockResolvedValueOnce(makeUser({ statutCompte: "ACTIF" }));
    const user = userEvent.setup();
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Réactiver" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/resteront désactivés/);

    await user.click(within(dialog).getByRole("button", { name: "Réactiver" }));

    await waitFor(() =>
      expect(updateAdminUserMock).toHaveBeenCalledWith("v1", { statutCompte: "ACTIF" }),
    );
  });

  it("disables the Suspendre button on the admin's own row", async () => {
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "admin-1", nom: "Ousmane Keïta", role: "ADMIN" })],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<VendeursView />);

    expect(await screen.findByRole("button", { name: "Suspendre" })).toBeDisabled();
  });

  it("shows a « Validé » badge for a validated vendor and no Valider button", async () => {
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: true })],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<VendeursView />);

    expect(await screen.findByText("Validé")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Valider" })).not.toBeInTheDocument();
  });

  it("shows an « En attente de validation » badge and a Valider button for an unvalidated vendor", async () => {
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: false })],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<VendeursView />);

    expect(await screen.findByText("En attente de validation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Valider" })).toBeInTheDocument();
  });

  it("validates a pending vendor through the confirmation dialog — PATCHes vendeurValide:true, mentions the notification, then refreshes the list", async () => {
    listAdminUsersMock.mockResolvedValueOnce({
      items: [makeUser({ vendeurValide: false })],
      total: 1,
      page: 1,
      limit: 20,
    });
    updateAdminUserMock.mockResolvedValueOnce(makeUser({ vendeurValide: true }));
    const user = userEvent.setup();
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");
    listAdminUsersMock.mockResolvedValueOnce({
      items: [makeUser({ vendeurValide: true })],
      total: 1,
      page: 1,
      limit: 20,
    });

    await user.click(screen.getByRole("button", { name: "Valider" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/pourra publier des produits/);
    expect(dialog).toHaveTextContent(/notifié/);
    expect(updateAdminUserMock).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(updateAdminUserMock).toHaveBeenCalledWith("v1", { vendeurValide: true }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Rafraîchit la liste après succès (pas seulement une mise à jour optimiste locale).
    await waitFor(() => expect(listAdminUsersMock).toHaveBeenCalledTimes(2));
  });

  it("does not call the API when the validation confirmation is cancelled", async () => {
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: false })],
      total: 1,
      page: 1,
      limit: 20,
    });
    const user = userEvent.setup();
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Valider" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(updateAdminUserMock).not.toHaveBeenCalled();
  });

  it("filters on « en attente de validation » — checking it re-fetches with vendeurValide=false and role=VENDEUR", async () => {
    const user = userEvent.setup();
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");
    listAdminUsersMock.mockClear();

    await user.click(screen.getByLabelText("En attente de validation"));

    await waitFor(() =>
      expect(listAdminUsersMock).toHaveBeenCalledWith(
        expect.objectContaining({ vendeurValide: false, role: "VENDEUR" }),
      ),
    );
  });

  it("pre-applies the « en attente de validation » filter when arriving with ?vendeurValide=false", async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("vendeurValide=false"));
    render(<VendeursView />);

    await waitFor(() =>
      expect(listAdminUsersMock).toHaveBeenCalledWith(
        expect.objectContaining({ vendeurValide: false, role: "VENDEUR" }),
      ),
    );
    expect(await screen.findByLabelText("En attente de validation")).toBeChecked();
  });
});
