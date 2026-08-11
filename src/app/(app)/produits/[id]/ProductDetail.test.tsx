import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { GeoProvider } from "@/lib/geo";
import { formatPrixGNF } from "@/lib/format";
import type { PublicUser } from "@/lib/auth/types";
import type { ProductView } from "@/lib/products/types";
import type { PurchaseRequestView } from "@/lib/purchase-requests/types";

import { ProductDetail } from "./ProductDetail";

/** getByText/toHaveTextContent normalize whitespace to a plain space before
 * matching — Intl's fr-FR grouping separator (a narrow no-break space) must
 * be normalized the same way in expected values. */
function normalizeSpaces(value: string): string {
  return value.replace(/ /g, " ");
}

const { useAuthMock, createOrCompletePurchaseRequestMock, refreshDemandesMock, listVendeurReviewsMock } =
  vi.hoisted(() => ({
    useAuthMock: vi.fn(),
    createOrCompletePurchaseRequestMock: vi.fn(),
    refreshDemandesMock: vi.fn(),
    listVendeurReviewsMock: vi.fn(),
  }));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, useAuth: useAuthMock };
});

vi.mock("next/navigation", () => ({ usePathname: () => "/produits/p1" }));

vi.mock("@/lib/reviews/api", () => ({ listVendeurReviews: listVendeurReviewsMock }));

vi.mock("@/lib/purchase-requests", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/purchase-requests")>("@/lib/purchase-requests");
  return {
    ...actual,
    createOrCompletePurchaseRequest: createOrCompletePurchaseRequestMock,
    useDemandes: () => ({
      demandes: [],
      loading: false,
      error: null,
      draftCount: 0,
      refresh: refreshDemandesMock,
    }),
  };
});

const DEMO_USER: PublicUser = {
  id: "u1",
  nom: "Ibrahima Camara",
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

function makeProduct(overrides: Partial<ProductView> = {}): ProductView {
  return {
    id: "p1",
    titre: "Pagne wax 6 yards",
    description: "Tissu wax authentique, motif géométrique, 6 yards complets.",
    prix: "185000",
    categorieId: "c1",
    vendeurId: "v1",
    latitude: 9.6412,
    longitude: -13.5784,
    actif: true,
    dateCreation: "2026-08-01T00:00:00.000Z",
    dateMiseAJour: "2026-08-01T00:00:00.000Z",
    categorie: { id: "c1", nom: "Mode & tissus", slug: "mode-tissus" },
    vendeur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "VERIFIE" },
    photos: [
      { id: "ph1", url: "https://cdn.example/ph1.jpg", urlMiniature: "https://cdn.example/ph1-min.jpg", ordre: 1 },
      { id: "ph2", url: "https://cdn.example/ph2.jpg", urlMiniature: "https://cdn.example/ph2-min.jpg", ordre: 2 },
    ],
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
    dateCreation: "2026-08-04T00:00:00.000Z",
    dateMiseAJour: "2026-08-04T00:00:00.000Z",
    items: [{ id: "item-1", produitId: "p1", quantite: 1, produit: { id: "p1", titre: "Pagne wax", prix: "185000", miniature: null } }],
    interlocuteur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "VERIFIE" },
    ...overrides,
  };
}

function renderDetail(product: ProductView) {
  return render(
    <GeoProvider>
      <ProductDetail product={product} />
    </GeoProvider>,
  );
}

describe("ProductDetail", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: DEMO_USER, loading: false, login: vi.fn(), logout: vi.fn(), refresh: vi.fn() });
    createOrCompletePurchaseRequestMock.mockReset();
    refreshDemandesMock.mockReset();
    listVendeurReviewsMock.mockReset();
    listVendeurReviewsMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 3,
      resume: { noteMoyenne: null, nbAvis: 0 },
    });
  });

  it("renders title, formatted price, description, category and vendor", () => {
    const product = makeProduct();
    renderDetail(product);

    expect(screen.getByRole("heading", { name: "Pagne wax 6 yards" })).toBeInTheDocument();
    expect(screen.getByText(normalizeSpaces(formatPrixGNF("185000")))).toBeInTheDocument();
    expect(screen.getByText(product.description)).toBeInTheDocument();
    expect(screen.getByText("Mode & tissus")).toBeInTheDocument();
    expect(screen.getByText("Fatoumata Bangoura")).toBeInTheDocument();
    expect(screen.getByText("vérifié")).toBeInTheDocument();
  });

  it("shows a placeholder and no thumbnails when the product has no photos", () => {
    renderDetail(makeProduct({ photos: [] }));
    expect(screen.getByText("Pas de photo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Photo 1/ })).not.toBeInTheDocument();
  });

  it("switches the main photo when a thumbnail is clicked", async () => {
    const user = userEvent.setup();
    renderDetail(makeProduct());

    const thumb2 = screen.getByRole("button", { name: "Photo 2" });
    expect(thumb2).toHaveAttribute("aria-current", "false");

    await user.click(thumb2);
    expect(thumb2).toHaveAttribute("aria-current", "true");
  });

  it("renders no contact buttons when vendeur.telephone is absent", () => {
    renderDetail(makeProduct());
    expect(screen.queryByRole("link", { name: "Appeler" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "WhatsApp" })).not.toBeInTheDocument();
  });

  it("renders tel: and wa.me contact links when vendeur.telephone is present", () => {
    const product = makeProduct({
      vendeur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "VERIFIE", telephone: "+224622000000" },
    });
    renderDetail(product);

    expect(screen.getByRole("link", { name: "Appeler" })).toHaveAttribute("href", "tel:+224622000000");
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/224622000000",
    );
  });

  it("shows the distance computed from the memorized position when both coordinates are known", () => {
    window.sessionStorage.setItem("makinum.position", JSON.stringify({ lat: 9.6, lng: -13.6 }));
    renderDetail(makeProduct({ latitude: 9.6412, longitude: -13.5784 }));

    expect(screen.getByText(/à .+ km de toi/)).toBeInTheDocument();
  });

  it("shows no distance when the position is unknown", () => {
    renderDetail(makeProduct());
    expect(screen.queryByText(/km de toi/)).not.toBeInTheDocument();
  });

  it("shows no distance when the product has no coordinates", () => {
    window.sessionStorage.setItem("makinum.position", JSON.stringify({ lat: 9.6, lng: -13.6 }));
    renderDetail(makeProduct({ latitude: null, longitude: null }));
    expect(screen.queryByText(/km de toi/)).not.toBeInTheDocument();
  });

  it("shows the vendor rating when noteMoyenne is present", () => {
    const product = makeProduct({
      vendeur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "CONFIANCE", noteMoyenne: 4.6, nbAvis: 23 },
    });
    renderDetail(product);
    expect(screen.getByText("★ 4.6 (23)")).toBeInTheDocument();
  });

  it("loads and renders the vendor reviews section for the product's vendeurId", async () => {
    listVendeurReviewsMock.mockResolvedValueOnce({
      items: [
        {
          note: 5,
          commentaire: "Rendez-vous respecté à Madina.",
          dateCreation: "2026-08-01T00:00:00.000Z",
          auteur: { nom: "Mariama C." },
          produit: { titre: "Pagne wax" },
        },
      ],
      total: 1,
      page: 1,
      limit: 3,
      resume: { noteMoyenne: 4.6, nbAvis: 1 },
    });
    renderDetail(makeProduct({ vendeurId: "v1" }));

    expect(await screen.findByText("Avis sur ce vendeur")).toBeInTheDocument();
    expect(screen.getByText("Mariama C.")).toBeInTheDocument();
    expect(listVendeurReviewsMock).toHaveBeenCalledWith("v1", { page: 1, limit: 3 });
  });

  describe("« Ajouter à ma demande »", () => {
    it("renders a link to /connexion?returnTo=<chemin courant> instead of the API call when logged out (T51)", () => {
      useAuthMock.mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: vi.fn(), refresh: vi.fn() });
      renderDetail(makeProduct());

      const addLink = screen.getByRole("link", { name: "Ajouter à ma demande" });
      expect(addLink).toHaveAttribute("href", "/connexion?returnTo=%2Fproduits%2Fp1");
      expect(createOrCompletePurchaseRequestMock).not.toHaveBeenCalled();
      // No quantity selector while logged out.
      expect(screen.queryByRole("button", { name: "Augmenter la quantité" })).not.toBeInTheDocument();
    });

    it("POSTs { produitId, quantite: 1 } by default and shows a success link to the request", async () => {
      const user = userEvent.setup();
      createOrCompletePurchaseRequestMock.mockResolvedValueOnce(makeDemande({ id: "d1" }));
      renderDetail(makeProduct({ id: "p1" }));

      await user.click(screen.getByRole("button", { name: "Ajouter à ma demande" }));

      await waitFor(() =>
        expect(createOrCompletePurchaseRequestMock).toHaveBeenCalledWith({ produitId: "p1", quantite: 1 }),
      );
      expect(await screen.findByText("Ajouté à ta demande.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Voir ma demande" })).toHaveAttribute("href", "/demandes/d1");
      expect(refreshDemandesMock).toHaveBeenCalledTimes(1);
    });

    it("lets the buyer increase the quantity before adding", async () => {
      const user = userEvent.setup();
      createOrCompletePurchaseRequestMock.mockResolvedValueOnce(makeDemande({ id: "d1" }));
      renderDetail(makeProduct({ id: "p1" }));

      await user.click(screen.getByRole("button", { name: "Augmenter la quantité" }));
      await user.click(screen.getByRole("button", { name: "Augmenter la quantité" }));
      await user.click(screen.getByRole("button", { name: "Ajouter à ma demande" }));

      await waitFor(() =>
        expect(createOrCompletePurchaseRequestMock).toHaveBeenCalledWith({ produitId: "p1", quantite: 3 }),
      );
    });

    it("shows a clear message for CANNOT_BUY_OWN_PRODUCT", async () => {
      const user = userEvent.setup();
      createOrCompletePurchaseRequestMock.mockRejectedValueOnce(
        new ApiError(400, "Impossible d’acheter son propre produit", "CANNOT_BUY_OWN_PRODUCT"),
      );
      renderDetail(makeProduct());

      await user.click(screen.getByRole("button", { name: "Ajouter à ma demande" }));

      expect(await screen.findByText("Impossible d'acheter ton propre produit.")).toBeInTheDocument();
      expect(screen.queryByText("Ajouté à ta demande.")).not.toBeInTheDocument();
    });
  });
});
