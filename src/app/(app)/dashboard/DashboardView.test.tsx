import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicUser } from "@/lib/auth/types";
import type { ProductView } from "@/lib/products/types";
import type { PurchaseRequestView } from "@/lib/purchase-requests/types";

import { DashboardView } from "./DashboardView";

const {
  useAuthMock,
  useNotificationsMock,
  useDemandesMock,
  useDemandesRecuesMock,
  getMyProductsMock,
  listVendeurReviewsMock,
  listReportsMock,
  listAdminUsersMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useNotificationsMock: vi.fn(),
  useDemandesMock: vi.fn(),
  useDemandesRecuesMock: vi.fn(),
  getMyProductsMock: vi.fn(),
  listVendeurReviewsMock: vi.fn(),
  listReportsMock: vi.fn(),
  listAdminUsersMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ useAuth: useAuthMock }));
vi.mock("@/lib/notifications/NotificationsProvider", () => ({
  useNotifications: useNotificationsMock,
}));
vi.mock("@/lib/purchase-requests/DemandesProvider", () => ({ useDemandes: useDemandesMock }));
vi.mock("@/lib/purchase-requests/DemandesRecuesProvider", () => ({
  useDemandesRecues: useDemandesRecuesMock,
}));
vi.mock("@/lib/products/vendor-api", () => ({
  getMyProducts: getMyProductsMock,
  MAX_PRODUITS_ACTIFS: 30,
}));
vi.mock("@/lib/reviews/api", () => ({ listVendeurReviews: listVendeurReviewsMock }));
vi.mock("@/lib/reports/api", () => ({ listReports: listReportsMock }));
vi.mock("@/lib/admin/api", () => ({ listAdminUsers: listAdminUsersMock }));

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
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

function makeDemande(overrides: Partial<PurchaseRequestView> = {}): PurchaseRequestView {
  return {
    id: "d1",
    statut: "EN_COURS",
    resultat: null,
    acheteurId: "u1",
    vendeurId: "v1",
    dateCreation: "2026-08-01T00:00:00.000Z",
    dateMiseAJour: "2026-08-01T00:00:00.000Z",
    items: [],
    interlocuteur: { id: "v1", nom: "Fatoumata", statutVendeur: "VERIFIE" },
    ...overrides,
  };
}

function makeProduct(overrides: Partial<ProductView> = {}): ProductView {
  return {
    id: "p1",
    titre: "Téléphone Android 128 Go",
    description: "Bon état",
    prix: "1500000",
    categorieId: "c1",
    vendeurId: "u1",
    latitude: null,
    longitude: null,
    actif: true,
    dateCreation: "2026-08-01T00:00:00.000Z",
    dateMiseAJour: "2026-08-01T00:00:00.000Z",
    categorie: { id: "c1", nom: "Électronique", slug: "electronique" },
    vendeur: { id: "u1", nom: "Fatoumata Bangoura", statutVendeur: "LIBRE" },
    photos: [],
    ...overrides,
  };
}

function tileFor(label: string): HTMLElement {
  const el = screen.getByText(label).closest("a");
  if (!el) throw new Error(`Tuile « ${label} » introuvable (pas de <a> parent).`);
  return el;
}

describe("DashboardView", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useNotificationsMock.mockReset();
    useDemandesMock.mockReset();
    useDemandesRecuesMock.mockReset();
    getMyProductsMock.mockReset();
    listVendeurReviewsMock.mockReset();
    listReportsMock.mockReset();
    listAdminUsersMock.mockReset();

    useNotificationsMock.mockReturnValue({
      nbNonLues: 3,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    useDemandesMock.mockReturnValue({
      demandes: [
        makeDemande({ id: "d1", statut: "EN_COURS" }),
        makeDemande({ id: "d2", statut: "EN_COURS" }),
        makeDemande({ id: "d3", statut: "ENVOYEE" }),
        makeDemande({ id: "d4", statut: "CLOTUREE" }),
        makeDemande({ id: "d5", statut: "CLOTUREE" }),
        makeDemande({ id: "d6", statut: "CLOTUREE" }),
      ],
      loading: false,
      error: null,
      draftCount: 2,
      refresh: vi.fn(),
    });
    useDemandesRecuesMock.mockReturnValue({
      demandesRecues: [],
      loading: false,
      error: null,
      pendingCount: 4,
      refresh: vi.fn(),
    });
  });

  it("greets the user by name with a role badge, and shows the base tiles/actions for an ACHETEUR", async () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ role: "ACHETEUR" }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    render(<DashboardView />);

    expect(await screen.findByText("Bonjour, Fatoumata Bangoura")).toBeInTheDocument();
    expect(screen.getByText("Acheteur", { selector: "span" })).toBeInTheDocument();

    expect(tileFor("Notifications non lues")).toHaveTextContent("3");
    expect(tileFor("Notifications non lues")).toHaveAttribute("href", "/notifications");
    expect(tileFor("Brouillons")).toHaveTextContent("2");
    expect(tileFor("Envoyées")).toHaveTextContent("1");
    expect(tileFor("Clôturées")).toHaveTextContent("3");
    [tileFor("Brouillons"), tileFor("Envoyées"), tileFor("Clôturées")].forEach((tile) =>
      expect(tile).toHaveAttribute("href", "/demandes"),
    );

    // Pas de tuiles vendeur/admin pour un ACHETEUR.
    expect(screen.queryByText("Produits actifs")).not.toBeInTheDocument();
    expect(screen.queryByText("Note moyenne")).not.toBeInTheDocument();
    expect(screen.queryByText("Signalements nouveaux")).not.toBeInTheDocument();
    expect(screen.queryByText("Utilisateurs")).not.toBeInTheDocument();

    // Actions rapides : socle commun seulement.
    expect(screen.getByRole("link", { name: "Voir les produits" })).toHaveAttribute(
      "href",
      "/produits",
    );
    expect(screen.getByRole("link", { name: "Ma demande" })).toHaveAttribute("href", "/demandes");
    expect(screen.queryByRole("link", { name: "Mon catalogue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Modération" })).not.toBeInTheDocument();

    // Aucun endpoint vendeur/admin n'est appelé pour un ACHETEUR.
    expect(getMyProductsMock).not.toHaveBeenCalled();
    expect(listVendeurReviewsMock).not.toHaveBeenCalled();
    expect(listReportsMock).not.toHaveBeenCalled();
    expect(listAdminUsersMock).not.toHaveBeenCalled();
  });

  it("shows the X/30 products gauge, pending count, note and seller quick actions for a VENDEUR", async () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ id: "v1", role: "VENDEUR" }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    getMyProductsMock.mockResolvedValue([
      makeProduct({ id: "p1", actif: true }),
      makeProduct({ id: "p2", actif: true }),
      makeProduct({ id: "p3", actif: true }),
      makeProduct({ id: "p4", actif: false }),
    ]);
    listVendeurReviewsMock.mockResolvedValue({
      items: [],
      total: 12,
      page: 1,
      limit: 1,
      resume: { noteMoyenne: 4.5, nbAvis: 12 },
    });

    render(<DashboardView />);

    await waitFor(() => expect(getMyProductsMock).toHaveBeenCalled());
    expect(await screen.findByText("3/30")).toBeInTheDocument();
    expect(tileFor("Produits actifs")).toHaveAttribute("href", "/vendeur/catalogue");
    expect(tileFor("Produits inactifs")).toHaveTextContent("1");

    expect(tileFor("Demandes reçues en attente")).toHaveTextContent("4");
    expect(tileFor("Demandes reçues en attente")).toHaveAttribute("href", "/vendeur/demandes");

    expect(await screen.findByText("★ 4.5 (12)")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Mon catalogue" })).toHaveAttribute(
      "href",
      "/vendeur/catalogue",
    );
    expect(screen.getByRole("link", { name: "Publier un produit" })).toHaveAttribute(
      "href",
      "/vendeur/produits/nouveau",
    );
    expect(screen.getByRole("link", { name: "Demandes reçues" })).toHaveAttribute(
      "href",
      "/vendeur/demandes",
    );

    // Pas de tuiles admin, pas d'appel admin pour un VENDEUR.
    expect(screen.queryByText("Signalements nouveaux")).not.toBeInTheDocument();
    expect(listReportsMock).not.toHaveBeenCalled();
    expect(listAdminUsersMock).not.toHaveBeenCalled();
  });

  it("shows a skeleton (no label yet) before the vendor products fetch resolves", async () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ id: "v1", role: "VENDEUR" }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    listVendeurReviewsMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 1,
      resume: { noteMoyenne: null, nbAvis: 0 },
    });
    let resolveProducts!: (value: ProductView[]) => void;
    getMyProductsMock.mockReturnValue(
      new Promise<ProductView[]>((resolve) => {
        resolveProducts = resolve;
      }),
    );

    render(<DashboardView />);

    expect(screen.queryByText("Produits actifs")).not.toBeInTheDocument();

    resolveProducts([makeProduct({ actif: true })]);

    expect(await screen.findByText("Produits actifs")).toBeInTheDocument();
    expect(tileFor("Produits actifs")).toHaveTextContent("1/30");
  });

  it("shows « — » on a tile whose endpoint fails, without breaking the rest of the page", async () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ id: "v1", role: "VENDEUR" }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    getMyProductsMock.mockRejectedValue(new Error("boom"));
    listVendeurReviewsMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 1,
      resume: { noteMoyenne: null, nbAvis: 0 },
    });

    render(<DashboardView />);

    expect(await screen.findByText("Produits actifs")).toBeInTheDocument();
    expect(tileFor("Produits actifs")).toHaveTextContent("—");
    // Le reste de la page (tuiles socle) reste utilisable.
    expect(tileFor("Brouillons")).toHaveTextContent("2");
  });

  it("shows reports and users tiles plus admin quick actions for an ADMIN", async () => {
    useAuthMock.mockReturnValue({
      user: makeUser({ id: "a1", role: "ADMIN" }),
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    listReportsMock.mockResolvedValue({ items: [], total: 5, page: 1, limit: 1 });
    listAdminUsersMock.mockResolvedValue({ items: [], total: 42, page: 1, limit: 1 });

    render(<DashboardView />);

    expect(await screen.findByText("5")).toBeInTheDocument();
    expect(tileFor("Signalements nouveaux")).toHaveAttribute("href", "/admin/moderation");
    expect(tileFor("Utilisateurs")).toHaveTextContent("42");
    expect(tileFor("Utilisateurs")).toHaveAttribute("href", "/admin/vendeurs");

    expect(screen.getByRole("link", { name: "Modération" })).toHaveAttribute(
      "href",
      "/admin/moderation",
    );
    expect(screen.getByRole("link", { name: "Vendeurs" })).toHaveAttribute(
      "href",
      "/admin/vendeurs",
    );

    expect(screen.queryByText("Produits actifs")).not.toBeInTheDocument();
    expect(getMyProductsMock).not.toHaveBeenCalled();
    expect(listVendeurReviewsMock).not.toHaveBeenCalled();
  });
});
