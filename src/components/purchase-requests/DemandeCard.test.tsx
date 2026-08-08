import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PublicUser } from "@/lib/auth/types";
import { DemandesProvider } from "@/lib/purchase-requests";
import type { PurchaseRequestView } from "@/lib/purchase-requests/types";

import { DemandeCard } from "./DemandeCard";

const { createReviewMock, listPurchaseRequestsMock, sendPurchaseRequestMock, useAuthMock, refreshAuthMock } =
  vi.hoisted(() => ({
    createReviewMock: vi.fn(),
    listPurchaseRequestsMock: vi.fn(),
    sendPurchaseRequestMock: vi.fn(),
    useAuthMock: vi.fn(),
    refreshAuthMock: vi.fn(),
  }));

vi.mock("@/lib/reviews/api", () => ({ createReview: createReviewMock }));
vi.mock("@/lib/auth", () => ({ useAuth: useAuthMock }));
vi.mock("@/lib/purchase-requests/api", () => ({
  listPurchaseRequests: listPurchaseRequestsMock,
  updatePurchaseRequestItemQuantity: vi.fn(),
  removePurchaseRequestItem: vi.fn(),
  sendPurchaseRequest: sendPurchaseRequestMock,
  cancelPurchaseRequest: vi.fn(),
  closePurchaseRequest: vi.fn(),
  createOrCompletePurchaseRequest: vi.fn(),
  getPurchaseRequest: vi.fn(),
}));

const USER_WITH_PHONE: PublicUser = {
  id: "u1",
  nom: "Moi",
  telephone: "+224622111111",
  telephoneVerifie: true,
  email: null,
  emailVerifie: false,
  role: "ACHETEUR",
  statutVendeur: "LIBRE",
  statutCompte: "ACTIF",
  vendeurValide: true,
  latitude: null,
  longitude: null,
};

const USER_WITHOUT_PHONE: PublicUser = { ...USER_WITH_PHONE, telephone: null };

function makeDemande(overrides: Partial<PurchaseRequestView> = {}): PurchaseRequestView {
  return {
    id: "d1",
    statut: "CLOTUREE",
    resultat: "ABOUTIE",
    acheteurId: "u1",
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

function renderCard(demande: PurchaseRequestView) {
  return render(
    <DemandesProvider>
      <DemandeCard demande={demande} />
    </DemandesProvider>,
  );
}

// Défaut partagé par toutes les suites de ce fichier : un compte avec
// téléphone déjà connu (le cas courant — pas de saisie demandée à l'envoi,
// T36). Les tests dédiés à l'envoi ci-dessous surchargent avec un mock local
// (USER_WITHOUT_PHONE) là où c'est le comportement testé.
beforeEach(() => {
  useAuthMock.mockReset();
  useAuthMock.mockReturnValue({
    user: USER_WITH_PHONE,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: refreshAuthMock,
  });
  refreshAuthMock.mockReset();
});

describe("DemandeCard — avis (demande CLOTUREE)", () => {
  beforeEach(() => {
    createReviewMock.mockReset();
    listPurchaseRequestsMock.mockReset();
    listPurchaseRequestsMock.mockResolvedValue([]);
  });

  it("submits { purchaseRequestId, note, commentaire } and shows « Avis envoyé ★N » on success", async () => {
    const user = userEvent.setup();
    createReviewMock.mockResolvedValueOnce({
      id: "r1",
      purchaseRequestId: "d1",
      vendeurId: "v1",
      produitId: "p1",
      note: 5,
      commentaire: "Impeccable",
      dateCreation: "2026-08-04T00:00:00.000Z",
      auteur: { nom: "Moi" },
      produit: { titre: "Sac en raphia" },
    });
    renderCard(makeDemande());

    await user.click(screen.getByRole("button", { name: "Laisser un avis" }));
    await user.click(screen.getByRole("radio", { name: "5 étoiles" }));
    await user.type(screen.getByLabelText("Commentaire (optionnel)"), "Impeccable");
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    await waitFor(() =>
      expect(createReviewMock).toHaveBeenCalledWith({
        purchaseRequestId: "d1",
        note: 5,
        commentaire: "Impeccable",
      }),
    );
    expect(await screen.findByText("Avis envoyé ★5")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Laisser un avis" })).not.toBeInTheDocument();
  });

  it("hides the button and shows a mention when REVIEW_ALREADY_EXISTS is returned", async () => {
    const user = userEvent.setup();
    createReviewMock.mockRejectedValueOnce(
      new ApiError(409, "Un avis a déjà été déposé pour cette demande", "REVIEW_ALREADY_EXISTS"),
    );
    renderCard(makeDemande());

    await user.click(screen.getByRole("button", { name: "Laisser un avis" }));
    await user.click(screen.getByRole("radio", { name: "4 étoiles" }));
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    expect(await screen.findByText("Tu as déjà laissé un avis pour cette demande.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Laisser un avis" })).not.toBeInTheDocument();
    expect(screen.queryByText("Comment s'est passé l'échange ?")).not.toBeInTheDocument();
  });

  it("shows a REQUEST_NOT_CLOSED message without hiding the form", async () => {
    const user = userEvent.setup();
    createReviewMock.mockRejectedValueOnce(
      new ApiError(409, "Demande non clôturée", "REQUEST_NOT_CLOSED"),
    );
    renderCard(makeDemande());

    await user.click(screen.getByRole("button", { name: "Laisser un avis" }));
    await user.click(screen.getByRole("radio", { name: "3 étoiles" }));
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    expect(await screen.findByText(/n'est pas encore clôturée/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publier mon avis" })).toBeInTheDocument();
  });

  it("does not render the review action on a non-closed demande", () => {
    renderCard(makeDemande({ statut: "ENVOYEE", resultat: null }));
    expect(screen.queryByRole("button", { name: "Laisser un avis" })).not.toBeInTheDocument();
  });
});

describe("DemandeCard — contact du vendeur (T43, perspective acheteur)", () => {
  beforeEach(() => {
    listPurchaseRequestsMock.mockReset();
    listPurchaseRequestsMock.mockResolvedValue([]);
  });

  it("renders tel: and wa.me contact links when interlocuteur.telephone is present", () => {
    renderCard(
      makeDemande({
        interlocuteur: {
          id: "v1",
          nom: "Fatoumata Bangoura",
          statutVendeur: "VERIFIE",
          telephone: "+224622000000",
        },
      }),
    );

    expect(screen.getByRole("link", { name: "Appeler" })).toHaveAttribute("href", "tel:+224622000000");
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/224622000000",
    );
  });

  it("renders no contact block when interlocuteur.telephone is absent (brouillon)", () => {
    renderCard(makeDemande({ statut: "EN_COURS", resultat: null }));

    expect(screen.queryByRole("link", { name: "Appeler" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "WhatsApp" })).not.toBeInTheDocument();
  });
});

describe("DemandeCard — envoi d'une demande (T36, téléphone de l'acheteur)", () => {
  beforeEach(() => {
    sendPurchaseRequestMock.mockReset();
    listPurchaseRequestsMock.mockReset();
    listPurchaseRequestsMock.mockResolvedValue([]);
  });

  it("does not ask for a phone number when the buyer's account already has one", async () => {
    const user = userEvent.setup();
    sendPurchaseRequestMock.mockResolvedValueOnce(makeDemande({ statut: "ENVOYEE" }));
    renderCard(makeDemande({ statut: "EN_COURS" }));

    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText(/numéro de téléphone/i)).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(sendPurchaseRequestMock).toHaveBeenCalledWith("d1"));
    expect(refreshAuthMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for a phone number when the account has none, then sends it in the request body", async () => {
    useAuthMock.mockReturnValue({
      user: USER_WITHOUT_PHONE,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: refreshAuthMock,
    });
    const user = userEvent.setup();
    sendPurchaseRequestMock.mockResolvedValueOnce(makeDemande({ statut: "ENVOYEE" }));
    renderCard(makeDemande({ statut: "EN_COURS" }));

    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    const dialog = await screen.findByRole("dialog");
    const phoneField = within(dialog).getByLabelText("Ton numéro de téléphone");
    expect(dialog).toHaveTextContent("Le vendeur te rappellera sur ce numéro.");

    // Validation client : champ vide → pas d'appel, message d'erreur affiché.
    await user.click(within(dialog).getByRole("button", { name: "Envoyer" }));
    expect(sendPurchaseRequestMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Un numéro est requis pour envoyer ta demande.")).toBeInTheDocument();

    await user.type(phoneField, "+224622000000");
    await user.click(within(dialog).getByRole("button", { name: "Envoyer" }));

    await waitFor(() =>
      expect(sendPurchaseRequestMock).toHaveBeenCalledWith("d1", "+224622000000"),
    );
    await waitFor(() => expect(refreshAuthMock).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("maps PHONE_ALREADY_USED to a field-level message and keeps the dialog open for retry", async () => {
    useAuthMock.mockReturnValue({
      user: USER_WITHOUT_PHONE,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: refreshAuthMock,
    });
    const user = userEvent.setup();
    sendPurchaseRequestMock.mockRejectedValueOnce(
      new ApiError(409, "Ce numéro de téléphone est déjà utilisé", "PHONE_ALREADY_USED"),
    );
    renderCard(makeDemande({ statut: "EN_COURS" }));

    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Ton numéro de téléphone"), "+224622000000");
    await user.click(within(dialog).getByRole("button", { name: "Envoyer" }));

    expect(
      await screen.findByText("Ce numéro est déjà utilisé par un autre compte."),
    ).toBeInTheDocument();
    // La modale reste ouverte pour permettre de corriger la saisie.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(refreshAuthMock).not.toHaveBeenCalled();
  });

  it("maps BUYER_PHONE_REQUIRED returned by the API to the same field-level message", async () => {
    useAuthMock.mockReturnValue({
      user: USER_WITHOUT_PHONE,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: refreshAuthMock,
    });
    const user = userEvent.setup();
    sendPurchaseRequestMock.mockRejectedValueOnce(
      new ApiError(400, "Un numéro de téléphone est nécessaire", "BUYER_PHONE_REQUIRED"),
    );
    renderCard(makeDemande({ statut: "EN_COURS" }));

    await user.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Ton numéro de téléphone"), "+224622000000");
    await user.click(within(dialog).getByRole("button", { name: "Envoyer" }));

    expect(
      await screen.findByText("Un numéro est requis pour envoyer ta demande."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
