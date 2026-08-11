import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminUserView } from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { GeoProvider } from "@/lib/geo";
import type { PublicUser } from "@/lib/auth/types";
import type { ProductView } from "@/lib/products/types";

import { VendeursView } from "./VendeursView";

const {
  listAdminUsersMock,
  updateAdminUserMock,
  deleteAdminUserMock,
  createProductForVendorMock,
  listCategoriesMock,
  useAuthMock,
  useSearchParamsMock,
} = vi.hoisted(() => ({
  listAdminUsersMock: vi.fn(),
  updateAdminUserMock: vi.fn(),
  deleteAdminUserMock: vi.fn(),
  createProductForVendorMock: vi.fn(),
  listCategoriesMock: vi.fn(),
  useAuthMock: vi.fn(),
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/lib/admin/api", () => ({
  listAdminUsers: listAdminUsersMock,
  updateAdminUser: updateAdminUserMock,
  deleteAdminUser: deleteAdminUserMock,
  createProductForVendor: createProductForVendorMock,
}));

vi.mock("@/lib/categories/api", () => ({ listCategories: listCategoriesMock }));

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
    autoriseAdminPublication: false,
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
    autoriseAdminPublication: false,
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

describe("VendeursView — conversion ACHETEUR → VENDEUR (T48b, action admin « Passer vendeur »)", () => {
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

  it("shows a « Passer vendeur » button only on ACHETEUR rows", async () => {
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR" })],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<VendeursView />);

    expect(await screen.findByRole("button", { name: "Passer vendeur" })).toBeInTheDocument();
  });

  it("does not show a « Passer vendeur » button on VENDEUR/ADMIN rows", async () => {
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    expect(screen.queryByRole("button", { name: "Passer vendeur" })).not.toBeInTheDocument();
  });

  it("asks for a phone number only when the ACHETEUR target has none", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR", telephone: null })],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<VendeursView />);
    await screen.findByText("Amadou Diallo");

    await user.click(screen.getByRole("button", { name: "Passer vendeur" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByLabelText("Téléphone")).toBeInTheDocument();
  });

  it("does not ask for a phone number when the ACHETEUR target already has one", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR", telephone: "+224622333333" })],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<VendeursView />);
    await screen.findByText("Amadou Diallo");

    await user.click(screen.getByRole("button", { name: "Passer vendeur" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).queryByLabelText("Téléphone")).not.toBeInTheDocument();
  });

  it("converts to VENDEUR with the entered phone, then refreshes the list", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValueOnce({
      items: [makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR", telephone: null })],
      total: 1,
      page: 1,
      limit: 20,
    });
    updateAdminUserMock.mockResolvedValueOnce(
      makeUser({ id: "a1", nom: "Amadou Diallo", role: "VENDEUR", telephone: "+224677000001", vendeurValide: false }),
    );
    render(<VendeursView />);
    await screen.findByText("Amadou Diallo");
    listAdminUsersMock.mockResolvedValueOnce({
      items: [
        makeUser({ id: "a1", nom: "Amadou Diallo", role: "VENDEUR", telephone: "+224677000001", vendeurValide: false }),
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    await user.click(screen.getByRole("button", { name: "Passer vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Téléphone"), "+224677000001");
    await user.click(within(dialog).getByRole("button", { name: "Passer vendeur" }));

    await waitFor(() =>
      expect(updateAdminUserMock).toHaveBeenCalledWith("a1", {
        role: "VENDEUR",
        telephone: "+224677000001",
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Rafraîchit la liste après succès (pas seulement une mise à jour optimiste locale).
    await waitFor(() => expect(listAdminUsersMock).toHaveBeenCalledTimes(2));
  });

  it("checking « Valider immédiatement » adds vendeurValide: true to the same PATCH", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [
        makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR", telephone: "+224622333333" }),
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    updateAdminUserMock.mockResolvedValueOnce(
      makeUser({ id: "a1", nom: "Amadou Diallo", role: "VENDEUR", vendeurValide: true }),
    );
    render(<VendeursView />);
    await screen.findByText("Amadou Diallo");

    await user.click(screen.getByRole("button", { name: "Passer vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByLabelText("Valider immédiatement"));
    await user.click(within(dialog).getByRole("button", { name: "Passer vendeur" }));

    await waitFor(() =>
      expect(updateAdminUserMock).toHaveBeenCalledWith("a1", {
        role: "VENDEUR",
        vendeurValide: true,
      }),
    );
  });

  it("does not call the API when the conversion confirmation is cancelled", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR" })],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<VendeursView />);
    await screen.findByText("Amadou Diallo");

    await user.click(screen.getByRole("button", { name: "Passer vendeur" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(updateAdminUserMock).not.toHaveBeenCalled();
  });

  it("requires a phone number client-side and keeps the dialog open without calling the API", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR", telephone: null })],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<VendeursView />);
    await screen.findByText("Amadou Diallo");

    await user.click(screen.getByRole("button", { name: "Passer vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Passer vendeur" }));

    expect(
      await within(dialog).findByText("Un numéro de téléphone est requis pour convertir ce compte en vendeur."),
    ).toBeInTheDocument();
    expect(updateAdminUserMock).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("maps PHONE_ALREADY_USED to the phone field and keeps the dialog open", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR", telephone: null })],
      total: 1,
      page: 1,
      limit: 20,
    });
    updateAdminUserMock.mockRejectedValueOnce(
      new ApiError(409, "Ce numéro de téléphone est déjà utilisé", "PHONE_ALREADY_USED"),
    );
    render(<VendeursView />);
    await screen.findByText("Amadou Diallo");

    await user.click(screen.getByRole("button", { name: "Passer vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Téléphone"), "+224677000001");
    await user.click(within(dialog).getByRole("button", { name: "Passer vendeur" }));

    expect(
      await within(dialog).findByText("Ce numéro de téléphone est déjà utilisé par un autre compte."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("maps PHONE_REQUIRED (server-side) to the phone field and keeps the dialog open", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR", telephone: null })],
      total: 1,
      page: 1,
      limit: 20,
    });
    updateAdminUserMock.mockRejectedValueOnce(
      new ApiError(400, "Un numéro de téléphone est requis", "PHONE_REQUIRED"),
    );
    render(<VendeursView />);
    await screen.findByText("Amadou Diallo");

    await user.click(screen.getByRole("button", { name: "Passer vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Téléphone"), "+224677000001");
    await user.click(within(dialog).getByRole("button", { name: "Passer vendeur" }));

    expect(
      await within(dialog).findByText("Un numéro de téléphone est requis pour convertir ce compte en vendeur."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("maps ALREADY_VENDOR to a general row error, closing the dialog", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR", telephone: "+224622333333" })],
      total: 1,
      page: 1,
      limit: 20,
    });
    updateAdminUserMock.mockRejectedValueOnce(
      new ApiError(409, "Ce compte est déjà un compte vendeur", "ALREADY_VENDOR"),
    );
    render(<VendeursView />);
    await screen.findByText("Amadou Diallo");

    await user.click(screen.getByRole("button", { name: "Passer vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Passer vendeur" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Ce compte est déjà un compte vendeur.")).toBeInTheDocument();
  });

  it("maps CANNOT_CONVERT_ADMIN to a general row error, closing the dialog", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR", telephone: "+224622333333" })],
      total: 1,
      page: 1,
      limit: 20,
    });
    updateAdminUserMock.mockRejectedValueOnce(
      new ApiError(400, "Impossible de convertir un compte administrateur en vendeur", "CANNOT_CONVERT_ADMIN"),
    );
    render(<VendeursView />);
    await screen.findByText("Amadou Diallo");

    await user.click(screen.getByRole("button", { name: "Passer vendeur" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Passer vendeur" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      await screen.findByText("Impossible de convertir un compte administrateur en vendeur."),
    ).toBeInTheDocument();
  });
});

describe("VendeursView — suppression de compte (T49b, DELETE /admin/utilisateurs/:id)", () => {
  beforeEach(() => {
    listAdminUsersMock.mockReset();
    updateAdminUserMock.mockReset();
    deleteAdminUserMock.mockReset();
    listAdminUsersMock.mockResolvedValue({ items: [makeUser()], total: 1, page: 1, limit: 20 });
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: makeAdmin(), loading: false, login: vi.fn(), logout: vi.fn(), refresh: vi.fn() });
    useSearchParamsMock.mockReset();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a « Supprimer » button on non-admin rows (VENDEUR, ACHETEUR)", async () => {
    listAdminUsersMock.mockResolvedValue({
      items: [
        makeUser({ id: "v1", nom: "Fatoumata Bangoura", role: "VENDEUR" }),
        makeUser({ id: "a1", nom: "Amadou Diallo", role: "ACHETEUR" }),
      ],
      total: 2,
      page: 1,
      limit: 20,
    });
    render(<VendeursView />);

    await screen.findByText("Fatoumata Bangoura");
    expect(screen.getAllByRole("button", { name: "Supprimer" })).toHaveLength(2);
  });

  it("does not show a « Supprimer » button on ADMIN rows", async () => {
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "admin-2", nom: "Mariame Camara", role: "ADMIN" })],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<VendeursView />);

    await screen.findByText("Mariame Camara");
    expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
  });

  it("opens a danger confirmation dialog mentioning irreversibility before calling the API", async () => {
    const user = userEvent.setup();
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Supprimer ce compte ?");
    expect(dialog).toHaveTextContent(/irréversible/);
    expect(dialog).toHaveTextContent(/se réinscrire/);
    expect(dialog).toHaveTextContent(/historique/);
    const confirmButton = within(dialog).getByRole("button", { name: "Supprimer" });
    expect(confirmButton.className).toContain("bg-danger");
    expect(deleteAdminUserMock).not.toHaveBeenCalled();
  });

  it("does not call the API when the delete confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteAdminUserMock).not.toHaveBeenCalled();
  });

  it("deletes the account on confirm (204) then refreshes the list", async () => {
    const user = userEvent.setup();
    deleteAdminUserMock.mockResolvedValueOnce(undefined);
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");
    listAdminUsersMock.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 20 });

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(deleteAdminUserMock).toHaveBeenCalledWith("v1"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Rafraîchit la liste après succès : le compte supprimé disparaît.
    await waitFor(() => expect(listAdminUsersMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("Fatoumata Bangoura")).not.toBeInTheDocument());
  });

  it("maps USER_HAS_HISTORY to a row-level error suggesting suspension instead", async () => {
    const user = userEvent.setup();
    deleteAdminUserMock.mockRejectedValueOnce(
      new ApiError(
        409,
        "Ce compte a un historique (produits, demandes, avis ou signalements) : suspendez-le plutôt que de le supprimer",
        "USER_HAS_HISTORY",
      ),
    );
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      await screen.findByText(
        "Ce compte a un historique (produits, demandes, avis ou signalements) : suspends-le plutôt que de le supprimer.",
      ),
    ).toBeInTheDocument();
    // Le compte reste dans la liste (la suppression a été refusée).
    expect(screen.getByText("Fatoumata Bangoura")).toBeInTheDocument();
  });

  it("maps CANNOT_DELETE_ADMIN to a row-level error", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ id: "v1", nom: "Fatoumata Bangoura", role: "VENDEUR" })],
      total: 1,
      page: 1,
      limit: 20,
    });
    deleteAdminUserMock.mockRejectedValueOnce(
      new ApiError(400, "Impossible de supprimer un compte administrateur", "CANNOT_DELETE_ADMIN"),
    );
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    expect(
      await screen.findByText("Impossible de supprimer un compte administrateur."),
    ).toBeInTheDocument();
  });

  it("maps USER_NOT_FOUND to a row-level error when the account was already deleted", async () => {
    const user = userEvent.setup();
    deleteAdminUserMock.mockRejectedValueOnce(
      new ApiError(404, "Utilisateur introuvable", "USER_NOT_FOUND"),
    );
    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    expect(await screen.findByText("Cet utilisateur est introuvable.")).toBeInTheDocument();
  });
});

describe("VendeursView — publication de produit par l'admin (T52b, action « Publier un produit »)", () => {
  const CATEGORIES = [
    { id: "c1", nom: "Mode & tissus", slug: "mode-tissus", parentId: null },
    { id: "c2", nom: "Alimentation", slug: "alimentation", parentId: null },
  ];

  function makeProduct(overrides: Partial<ProductView> = {}): ProductView {
    return {
      id: "p1",
      titre: "Pagne wax",
      description: "Tissu wax authentique.",
      prix: "185000",
      categorieId: "c1",
      vendeurId: "v1",
      latitude: null,
      longitude: null,
      actif: true,
      dateCreation: "2026-08-01T00:00:00.000Z",
      dateMiseAJour: "2026-08-01T00:00:00.000Z",
      categorie: { id: "c1", nom: "Mode & tissus", slug: "mode-tissus" },
      vendeur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "VERIFIE" },
      photos: [],
      ...overrides,
    };
  }

  function renderView() {
    return render(
      <GeoProvider>
        <VendeursView />
      </GeoProvider>,
    );
  }

  beforeEach(() => {
    listAdminUsersMock.mockReset();
    createProductForVendorMock.mockReset();
    listCategoriesMock.mockReset();
    listCategoriesMock.mockResolvedValue(CATEGORIES);
    listAdminUsersMock.mockResolvedValue({ items: [makeUser()], total: 1, page: 1, limit: 20 });
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: makeAdmin(), loading: false, login: vi.fn(), logout: vi.fn(), refresh: vi.fn() });
    useSearchParamsMock.mockReset();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not show the button when the target is not yet validated (vendeurValide: false)", async () => {
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: false, autoriseAdminPublication: true })],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderView();

    await screen.findByText("Fatoumata Bangoura");
    expect(screen.queryByRole("button", { name: "Publier un produit" })).not.toBeInTheDocument();
  });

  it("does not show the button when the target has not authorized admin publication", async () => {
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: true, autoriseAdminPublication: false })],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderView();

    await screen.findByText("Fatoumata Bangoura");
    expect(screen.queryByRole("button", { name: "Publier un produit" })).not.toBeInTheDocument();
  });

  it("shows the button only when both conditions are true", async () => {
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: true, autoriseAdminPublication: true })],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderView();

    expect(await screen.findByRole("button", { name: "Publier un produit" })).toBeInTheDocument();
  });

  it("opens a modal naming the target vendor and loads categories", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: true, autoriseAdminPublication: true })],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderView();
    await screen.findByRole("button", { name: "Publier un produit" });

    await user.click(screen.getByRole("button", { name: "Publier un produit" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Fatoumata Bangoura");
    expect(await within(dialog).findByRole("option", { name: "Mode & tissus" })).toBeInTheDocument();
  });

  it("submits the product to the right vendeurId, shows success, and refreshes the list", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValueOnce({
      items: [makeUser({ id: "v1", vendeurValide: true, autoriseAdminPublication: true })],
      total: 1,
      page: 1,
      limit: 20,
    });
    createProductForVendorMock.mockResolvedValueOnce(makeProduct({ id: "p1", vendeurId: "v1" }));
    renderView();
    await screen.findByRole("button", { name: "Publier un produit" });
    listAdminUsersMock.mockResolvedValueOnce({
      items: [makeUser({ id: "v1", vendeurValide: true, autoriseAdminPublication: true })],
      total: 1,
      page: 1,
      limit: 20,
    });

    await user.click(screen.getByRole("button", { name: "Publier un produit" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", { name: "Mode & tissus" });

    await user.type(within(dialog).getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(within(dialog).getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(within(dialog).getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(within(dialog).getByLabelText("Catégorie"), "c1");
    await user.click(within(dialog).getByRole("button", { name: "Publier le produit" }));

    await waitFor(() =>
      expect(createProductForVendorMock).toHaveBeenCalledWith("v1", {
        titre: "Pagne wax",
        description: "Tissu wax authentique.",
        prix: 185000,
        categorieId: "c1",
        latitude: undefined,
        longitude: undefined,
      }),
    );
    expect(await within(dialog).findByText(/Produit publié/)).toBeInTheDocument();
    // Rafraîchit la liste après succès, même convention que les autres actions de cet écran.
    await waitFor(() => expect(listAdminUsersMock).toHaveBeenCalledTimes(2));
  });

  it("maps USER_NOT_FOUND to a clear message", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: true, autoriseAdminPublication: true })],
      total: 1,
      page: 1,
      limit: 20,
    });
    createProductForVendorMock.mockRejectedValueOnce(
      new ApiError(404, "Utilisateur introuvable", "USER_NOT_FOUND"),
    );
    renderView();
    await screen.findByRole("button", { name: "Publier un produit" });

    await user.click(screen.getByRole("button", { name: "Publier un produit" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", { name: "Mode & tissus" });
    await user.type(within(dialog).getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(within(dialog).getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(within(dialog).getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(within(dialog).getByLabelText("Catégorie"), "c1");
    await user.click(within(dialog).getByRole("button", { name: "Publier le produit" }));

    expect(await within(dialog).findByText("Ce vendeur est introuvable.")).toBeInTheDocument();
  });

  it("maps VENDOR_NOT_VALIDATED to a clear message", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: true, autoriseAdminPublication: true })],
      total: 1,
      page: 1,
      limit: 20,
    });
    createProductForVendorMock.mockRejectedValueOnce(
      new ApiError(403, "Ce vendeur doit être validé", "VENDOR_NOT_VALIDATED"),
    );
    renderView();
    await screen.findByRole("button", { name: "Publier un produit" });

    await user.click(screen.getByRole("button", { name: "Publier un produit" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", { name: "Mode & tissus" });
    await user.type(within(dialog).getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(within(dialog).getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(within(dialog).getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(within(dialog).getByLabelText("Catégorie"), "c1");
    await user.click(within(dialog).getByRole("button", { name: "Publier le produit" }));

    expect(
      await within(dialog).findByText(
        "Ce vendeur doit être validé par un administrateur avant de publier des produits.",
      ),
    ).toBeInTheDocument();
  });

  it("maps ADMIN_PUBLISH_NOT_AUTHORIZED to a message explaining the vendor withdrew consent", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: true, autoriseAdminPublication: true })],
      total: 1,
      page: 1,
      limit: 20,
    });
    createProductForVendorMock.mockRejectedValueOnce(
      new ApiError(403, "Publication non autorisée", "ADMIN_PUBLISH_NOT_AUTHORIZED"),
    );
    renderView();
    await screen.findByRole("button", { name: "Publier un produit" });

    await user.click(screen.getByRole("button", { name: "Publier un produit" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", { name: "Mode & tissus" });
    await user.type(within(dialog).getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(within(dialog).getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(within(dialog).getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(within(dialog).getByLabelText("Catégorie"), "c1");
    await user.click(within(dialog).getByRole("button", { name: "Publier le produit" }));

    expect(
      await within(dialog).findByText(
        "Ce vendeur n'a pas autorisé l'équipe Makinum à publier des produits en son nom.",
      ),
    ).toBeInTheDocument();
  });

  it("maps PRODUCT_LIMIT_REACHED to a message explaining the vendor's catalogue is full", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: true, autoriseAdminPublication: true })],
      total: 1,
      page: 1,
      limit: 20,
    });
    createProductForVendorMock.mockRejectedValueOnce(
      new ApiError(409, "Limite atteinte", "PRODUCT_LIMIT_REACHED"),
    );
    renderView();
    await screen.findByRole("button", { name: "Publier un produit" });

    await user.click(screen.getByRole("button", { name: "Publier un produit" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", { name: "Mode & tissus" });
    await user.type(within(dialog).getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(within(dialog).getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(within(dialog).getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(within(dialog).getByLabelText("Catégorie"), "c1");
    await user.click(within(dialog).getByRole("button", { name: "Publier le produit" }));

    expect(
      await within(dialog).findByText(
        "Le catalogue de ce vendeur est déjà plein (30 produits actifs) — désactive un produit avant d'en publier un nouveau.",
      ),
    ).toBeInTheDocument();
  });

  it("closes the modal on Escape without submitting", async () => {
    const user = userEvent.setup();
    listAdminUsersMock.mockResolvedValue({
      items: [makeUser({ vendeurValide: true, autoriseAdminPublication: true })],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderView();
    await screen.findByRole("button", { name: "Publier un produit" });

    await user.click(screen.getByRole("button", { name: "Publier un produit" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(createProductForVendorMock).not.toHaveBeenCalled();
  });
});
