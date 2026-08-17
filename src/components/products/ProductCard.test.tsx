import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ProductSearchItem } from "@/lib/products/types";

import { ProductCard } from "./ProductCard";

/**
 * T44 — la fiche vendeur (`GET /vendeurs/:id`) peut alimenter cette carte
 * avec des `produits` au format « fiche produit » plutôt que « item de
 * recherche » : `distanceKm`, `vendeur.noteMoyenne`, `vendeur.nbAvis`
 * arrivent alors en `undefined` plutôt qu'en `null`. Ces tests couvrent les
 * deux absences pour garantir qu'aucun libellé orphelin ne s'affiche.
 */
const BASE_ITEM: ProductSearchItem = {
  id: "p1",
  titre: "Pagne wax 6 yards",
  prix: "185000",
  latitude: 9.6412,
  longitude: -13.5784,
  distanceKm: 2.4,
  miniature: "https://example.com/photo.jpg",
  categorie: { nom: "Mode & tissus", slug: "mode-tissus" },
  vendeur: {
    id: "v1",
    nom: "Fatoumata Diallo",
    statutVendeur: "VERIFIE",
    noteMoyenne: 4.5,
    nbAvis: 12,
  },
};

describe("ProductCard", () => {
  it("affiche la photo, la distance et la note quand tous les champs sont présents", () => {
    render(<ProductCard item={BASE_ITEM} />);

    expect(screen.getByRole("img", { name: "Pagne wax 6 yards" })).toHaveAttribute(
      "src",
      "https://example.com/photo.jpg",
    );
    expect(screen.getByText("2.4 km")).toBeInTheDocument();
    expect(screen.getByText("★ 4.5 (12)")).toBeInTheDocument();
  });

  it("replie sur le placeholder photo quand miniature est absente (undefined)", () => {
    const item: ProductSearchItem = { ...BASE_ITEM, miniature: undefined as unknown as null };
    render(<ProductCard item={item} />);

    expect(screen.getByText("Pas de photo")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("replie sur le placeholder photo quand miniature est null", () => {
    const item: ProductSearchItem = { ...BASE_ITEM, miniature: null };
    render(<ProductCard item={item} />);

    expect(screen.getByText("Pas de photo")).toBeInTheDocument();
  });

  it("replie sur la mention neutre quand distanceKm est undefined, sans « km » orphelin", () => {
    const item: ProductSearchItem = {
      ...BASE_ITEM,
      distanceKm: undefined as unknown as null,
    };
    render(<ProductCard item={item} />);

    expect(screen.getByText("Localisation non précisée")).toBeInTheDocument();
    expect(screen.queryByText(/km/)).not.toBeInTheDocument();
  });

  it("replie sur la mention neutre quand distanceKm est null", () => {
    const item: ProductSearchItem = { ...BASE_ITEM, distanceKm: null };
    render(<ProductCard item={item} />);

    expect(screen.getByText("Localisation non précisée")).toBeInTheDocument();
    expect(screen.queryByText(/km/)).not.toBeInTheDocument();
  });

  it("masque le bloc note quand noteMoyenne et nbAvis sont undefined, sans « ★ () » vide", () => {
    const item: ProductSearchItem = {
      ...BASE_ITEM,
      vendeur: {
        ...BASE_ITEM.vendeur,
        noteMoyenne: undefined as unknown as null,
        nbAvis: undefined as unknown as number,
      },
    };
    render(<ProductCard item={item} />);

    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    expect(screen.queryByText("()")).not.toBeInTheDocument();
  });

  it("masque le bloc note quand noteMoyenne est null (cas existant)", () => {
    const item: ProductSearchItem = {
      ...BASE_ITEM,
      vendeur: { ...BASE_ITEM.vendeur, noteMoyenne: null },
    };
    render(<ProductCard item={item} />);

    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it("masque le bloc note quand noteMoyenne est défini mais nbAvis est undefined", () => {
    const item: ProductSearchItem = {
      ...BASE_ITEM,
      vendeur: {
        ...BASE_ITEM.vendeur,
        noteMoyenne: 4.5,
        nbAvis: undefined as unknown as number,
      },
    };
    render(<ProductCard item={item} />);

    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  // T58 — défaut de showDistance inchangé : /produits et la fiche vendeur
  // n'appellent pas la prop, la zone distance/repli doit continuer de
  // s'afficher exactement comme avant l'introduction de la prop.
  it("affiche toujours la zone distance par défaut (showDistance omis) quand distanceKm est connu", () => {
    render(<ProductCard item={BASE_ITEM} />);

    expect(screen.getByText("2.4 km")).toBeInTheDocument();
  });

  it("affiche toujours « Localisation non précisée » par défaut (showDistance omis) quand distanceKm est null", () => {
    const item: ProductSearchItem = { ...BASE_ITEM, distanceKm: null };
    render(<ProductCard item={item} />);

    expect(screen.getByText("Localisation non précisée")).toBeInTheDocument();
  });

  it("masque entièrement la zone distance quand showDistance vaut false, même si distanceKm est connu", () => {
    render(<ProductCard item={BASE_ITEM} showDistance={false} />);

    expect(screen.queryByText("2.4 km")).not.toBeInTheDocument();
    expect(screen.queryByText("Localisation non précisée")).not.toBeInTheDocument();
  });

  it("masque entièrement la zone distance quand showDistance vaut false et distanceKm est null", () => {
    const item: ProductSearchItem = { ...BASE_ITEM, distanceKm: null };
    render(<ProductCard item={item} showDistance={false} />);

    expect(screen.queryByText(/km/)).not.toBeInTheDocument();
    expect(screen.queryByText("Localisation non précisée")).not.toBeInTheDocument();
  });
});
