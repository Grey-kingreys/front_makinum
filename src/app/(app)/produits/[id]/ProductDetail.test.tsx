import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { GeoProvider } from "@/lib/geo";
import { formatPrixGNF } from "@/lib/format";
import type { ProductView } from "@/lib/products/types";

import { ProductDetail } from "./ProductDetail";

/** getByText/toHaveTextContent normalize whitespace to a plain space before
 * matching — Intl's fr-FR grouping separator (a narrow no-break space) must
 * be normalized the same way in expected values. */
function normalizeSpaces(value: string): string {
  return value.replace(/ /g, " ");
}

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

  it("disables 'Ajouter à ma demande' with the 'Bientôt disponible' title", () => {
    renderDetail(makeProduct());
    const addButton = screen.getByRole("button", { name: "Ajouter à ma demande" });
    expect(addButton).toBeDisabled();
    expect(addButton).toHaveAttribute("title", "Bientôt disponible");
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
});
