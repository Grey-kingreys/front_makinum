import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PublicUser } from "@/lib/auth/types";
import { DemandesProvider } from "@/lib/purchase-requests";
import type { PurchaseRequestView } from "@/lib/purchase-requests/types";

import { DemandeDetailView } from "./DemandeDetailView";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const {
  useAuthMock,
  getPurchaseRequestMock,
  listPurchaseRequestsMock,
  removePurchaseRequestItemMock,
  sendPurchaseRequestMock,
  cancelPurchaseRequestMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getPurchaseRequestMock: vi.fn(),
  listPurchaseRequestsMock: vi.fn(),
  removePurchaseRequestItemMock: vi.fn(),
  sendPurchaseRequestMock: vi.fn(),
  cancelPurchaseRequestMock: vi.fn(),
}));

// DemandeCard consulte useAuth() (T36 — numéro de téléphone à l'envoi) ; un
// utilisateur avec téléphone déjà connu reproduit le comportement d'avant
// T36 pour ces tests (aucun champ demandé, corps d'envoi inchangé).
const DEMO_USER: PublicUser = {
  id: "moi",
  nom: "Ibrahima Camara",
  telephone: "+224622111111",
  telephoneVerifie: true,
  email: null,
  emailVerifie: false,
  role: "ACHETEUR",
  statutVendeur: "LIBRE",
  statutCompte: "ACTIF",
  latitude: null,
  longitude: null,
};

vi.mock("@/lib/auth", () => ({ useAuth: useAuthMock }));

vi.mock("@/lib/purchase-requests/api", () => ({
  getPurchaseRequest: getPurchaseRequestMock,
  listPurchaseRequests: listPurchaseRequestsMock,
  removePurchaseRequestItem: removePurchaseRequestItemMock,
  sendPurchaseRequest: sendPurchaseRequestMock,
  cancelPurchaseRequest: cancelPurchaseRequestMock,
  updatePurchaseRequestItemQuantity: vi.fn(),
  closePurchaseRequest: vi.fn(),
  createOrCompletePurchaseRequest: vi.fn(),
}));

function makeDemande(overrides: Partial<PurchaseRequestView> = {}): PurchaseRequestView {
  return {
    id: "d1",
    statut: "EN_COURS",
    resultat: null,
    acheteurId: "moi",
    vendeurId: "v1",
    dateCreation: "2026-08-01T00:00:00.000Z",
    dateMiseAJour: "2026-08-01T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        produitId: "p1",
        quantite: 1,
        produit: { id: "p1", titre: "Sac en raphia", prix: "150000", miniature: null },
      },
    ],
    interlocuteur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "VERIFIE" },
    ...overrides,
  };
}

function renderDetail(id = "d1") {
  return render(
    <DemandesProvider>
      <DemandeDetailView demandeId={id} />
    </DemandesProvider>,
  );
}

describe("DemandeDetailView", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      user: DEMO_USER,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    getPurchaseRequestMock.mockReset();
    listPurchaseRequestsMock.mockReset();
    listPurchaseRequestsMock.mockResolvedValue([]);
    removePurchaseRequestItemMock.mockReset();
    sendPurchaseRequestMock.mockReset();
    cancelPurchaseRequestMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the demande's vendor, items and total", async () => {
    getPurchaseRequestMock.mockResolvedValueOnce(makeDemande());
    renderDetail();

    expect(await screen.findByText("Fatoumata Bangoura")).toBeInTheDocument();
    expect(screen.getByText("Sac en raphia")).toBeInTheDocument();
    expect(getPurchaseRequestMock).toHaveBeenCalledWith("d1");
  });

  it("shows a clean 404 message for a missing/foreign demande", async () => {
    getPurchaseRequestMock.mockRejectedValueOnce(
      new ApiError(404, "Demande introuvable", "PURCHASE_REQUEST_NOT_FOUND"),
    );
    renderDetail("missing");

    expect(await screen.findByText("Cette demande est introuvable.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Retour à mes demandes/ })).toHaveAttribute(
      "href",
      "/demandes",
    );
  });

  it("sends the draft after confirmation and reflects ENVOYEE locally", async () => {
    const user = userEvent.setup();
    getPurchaseRequestMock.mockResolvedValueOnce(makeDemande({ statut: "EN_COURS" }));
    sendPurchaseRequestMock.mockResolvedValueOnce(makeDemande({ statut: "ENVOYEE" }));

    renderDetail();
    await screen.findByRole("button", { name: "Envoyer la demande" });
    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(sendPurchaseRequestMock).toHaveBeenCalledWith("d1"));
    expect(await screen.findByText("Envoyée")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Envoyer la demande" })).not.toBeInTheDocument();
  });

  it("redirects to /demandes when the last item is removed (demande disappears)", async () => {
    const user = userEvent.setup();
    getPurchaseRequestMock.mockResolvedValueOnce(makeDemande());
    removePurchaseRequestItemMock.mockResolvedValueOnce({ demande: null });

    renderDetail();
    await screen.findByText("Sac en raphia");
    await user.click(screen.getByRole("button", { name: /Retirer Sac en raphia/ }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/demandes"));
  });
});
