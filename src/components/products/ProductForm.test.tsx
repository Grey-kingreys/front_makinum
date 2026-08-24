import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GeoProvider } from "@/lib/geo";
import type { CategoryListItem } from "@/lib/categories/types";

import { ProductForm, type ProductFormPayload } from "./ProductForm";

/** Intl's fr-FR grouping separator is a narrow no-break space — normalize
 * like the other formatting tests (ProductDetail.test.tsx) before matching. */
function normalizeSpaces(value: string): string {
  return value.replace(/ | /g, " ");
}

const CATEGORIES: CategoryListItem[] = [
  { id: "c1", nom: "Mode & tissus", slug: "mode-tissus", parentId: null },
  { id: "c2", nom: "Alimentation", slug: "alimentation", parentId: null },
];

function stubGeolocation(
  impl: (success: PositionCallback, error?: PositionErrorCallback) => void,
): void {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: impl },
  });
}

function renderForm(props: Partial<ComponentProps<typeof ProductForm>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn();
  render(
    <GeoProvider>
      <ProductForm
        categories={CATEGORIES}
        submitLabel="Publier le produit"
        submittingLabel="Publication…"
        submitting={false}
        onSubmit={onSubmit}
        {...props}
      />
    </GeoProvider>,
  );
  return { onSubmit };
}

describe("ProductForm", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
  });

  it("pre-fills fields from initialValues, including the formatted price", () => {
    renderForm({
      initialValues: {
        titre: "Pagne wax 6 yards",
        description: "Tissu wax authentique.",
        prix: "185000",
        categorieId: "c2",
        latitude: 9.6412,
        longitude: -13.5784,
      },
    });

    expect(screen.getByLabelText("Titre du produit")).toHaveValue("Pagne wax 6 yards");
    expect(screen.getByLabelText("Description")).toHaveValue("Tissu wax authentique.");
    expect(normalizeSpaces((screen.getByLabelText("Prix (GNF)") as HTMLInputElement).value)).toBe(
      "185 000",
    );
    expect(screen.getByLabelText("Catégorie")).toHaveValue("c2");
    expect(screen.getByText("✓ Position enregistrée")).toBeInTheDocument();
    expect(screen.queryByText(/9\.6412/)).not.toBeInTheDocument();
    expect(screen.queryByText(/-13\.5784/)).not.toBeInTheDocument();
  });

  it("formats the price with thousand separators as the user types", async () => {
    const user = userEvent.setup();
    renderForm();

    const prixInput = screen.getByLabelText("Prix (GNF)");
    await user.type(prixInput, "185000");

    expect(normalizeSpaces((prixInput as HTMLInputElement).value)).toBe("185 000");
  });

  it("shows an error on the missing field only when the category is the only thing missing", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(screen.getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(screen.getByLabelText("Prix (GNF)"), "185000");
    await user.click(screen.getByRole("button", { name: "Publier le produit" }));

    expect(screen.getByText("Choisis une catégorie.")).toBeInTheDocument();
    expect(screen.queryByText("Le titre est requis.")).not.toBeInTheDocument();
    expect(screen.queryByText("La description est requise.")).not.toBeInTheDocument();
    expect(screen.queryByText("Indique un prix supérieur à 0.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Catégorie")).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an error on the missing field only when the title is the only thing missing", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(screen.getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "c1");
    await user.click(screen.getByRole("button", { name: "Publier le produit" }));

    expect(screen.getByText("Le titre est requis.")).toBeInTheDocument();
    expect(screen.queryByText("La description est requise.")).not.toBeInTheDocument();
    expect(screen.queryByText("Indique un prix supérieur à 0.")).not.toBeInTheDocument();
    expect(screen.queryByText("Choisis une catégorie.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Titre du produit")).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears a field's error once the user corrects it", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(screen.getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "c1");
    await user.click(screen.getByRole("button", { name: "Publier le produit" }));

    expect(screen.getByText("Le titre est requis.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Titre du produit"), "Pagne wax");

    expect(screen.queryByText("Le titre est requis.")).not.toBeInTheDocument();
  });

  it("rejects a price of zero with a field-specific message", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(screen.getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(screen.getByLabelText("Prix (GNF)"), "0");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "c1");
    await user.click(screen.getByRole("button", { name: "Publier le produit" }));

    expect(screen.getByText("Indique un prix supérieur à 0.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a message and disables the submit button when no categories are available", () => {
    const onSubmit = vi.fn();
    renderForm({ categories: [], onSubmit });

    expect(
      screen.getByText("Aucune catégorie disponible — contacte l'administrateur."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Catégorie")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publier le produit" })).toBeDisabled();
  });

  it("submits the trimmed payload with prix as a number", async () => {
    const user = userEvent.setup();
    let received: ProductFormPayload | undefined;
    const onSubmit = vi.fn((payload: ProductFormPayload) => {
      received = payload;
    });
    renderForm({ onSubmit });

    await user.type(screen.getByLabelText("Titre du produit"), "  Pagne wax  ");
    await user.type(screen.getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(screen.getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "c1");
    await user.click(screen.getByRole("button", { name: "Publier le produit" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(received).toEqual({
      titre: "Pagne wax",
      description: "Tissu wax authentique.",
      prix: 185000,
      categorieId: "c1",
      latitude: undefined,
      longitude: undefined,
    });
  });

  it("shows the distance-sort consequence message while no position is set, and never shows raw coordinates", async () => {
    stubGeolocation((success) => {
      success({ coords: { latitude: 9.6412, longitude: -13.5784 } } as GeolocationPosition);
    });
    const user = userEvent.setup();
    renderForm();

    expect(
      screen.getByText(
        "Sans position, ton produit n'apparaîtra pas dans le tri par distance.",
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Je suis sur mon lieu de vente — utiliser ma position" }),
    );

    await waitFor(() => expect(screen.getByText("✓ Position enregistrée")).toBeInTheDocument());
    expect(
      screen.queryByText(
        "Sans position, ton produit n'apparaîtra pas dans le tri par distance.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/9\.6412/)).not.toBeInTheDocument();
    expect(screen.queryByText(/-13\.5784/)).not.toBeInTheDocument();
  });

  it("clears the position when « Retirer » is clicked, and the consequence message returns", async () => {
    const user = userEvent.setup();
    renderForm({
      initialValues: { latitude: 9.6412, longitude: -13.5784 },
    });

    expect(screen.getByText("✓ Position enregistrée")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Sans position, ton produit n'apparaîtra pas dans le tri par distance.",
      ),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retirer" }));

    expect(screen.queryByText("✓ Position enregistrée")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Sans position, ton produit n'apparaîtra pas dans le tri par distance.",
      ),
    ).toBeInTheDocument();
  });

  it("submits latitude/longitude in the payload after capturing the position", async () => {
    stubGeolocation((success) => {
      success({ coords: { latitude: 9.6412, longitude: -13.5784 } } as GeolocationPosition);
    });
    const user = userEvent.setup();
    let received: ProductFormPayload | undefined;
    const onSubmit = vi.fn((payload: ProductFormPayload) => {
      received = payload;
    });
    renderForm({ onSubmit });

    await user.type(screen.getByLabelText("Titre du produit"), "Pagne wax");
    await user.type(screen.getByLabelText("Description"), "Tissu wax authentique.");
    await user.type(screen.getByLabelText("Prix (GNF)"), "185000");
    await user.selectOptions(screen.getByLabelText("Catégorie"), "c1");
    await user.click(
      screen.getByRole("button", { name: "Je suis sur mon lieu de vente — utiliser ma position" }),
    );
    await waitFor(() => expect(screen.getByText("✓ Position enregistrée")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Publier le produit" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(received).toEqual({
      titre: "Pagne wax",
      description: "Tissu wax authentique.",
      prix: 185000,
      categorieId: "c1",
      latitude: 9.6412,
      longitude: -13.5784,
    });
  });

  describe("vendorLocation (T66b — pré-remplissage depuis le lieu de vente du compte)", () => {
    it("pre-fills latitude/longitude from vendorLocation and shows the vendor-location message, never raw coordinates", () => {
      renderForm({ vendorLocation: { latitude: 9.6412, longitude: -13.5784 } });

      expect(
        screen.getByText(
          "✓ Position de ton lieu de vente — tu peux la retirer ou la remplacer pour ce produit.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText("✓ Position enregistrée")).not.toBeInTheDocument();
      expect(screen.queryByText(/9\.6412/)).not.toBeInTheDocument();
      expect(screen.queryByText(/-13\.5784/)).not.toBeInTheDocument();
    });

    it("submits the vendorLocation coordinates untouched when the vendor doesn't interact with the position field", async () => {
      const user = userEvent.setup();
      let received: ProductFormPayload | undefined;
      const onSubmit = vi.fn((payload: ProductFormPayload) => {
        received = payload;
      });
      renderForm({ vendorLocation: { latitude: 9.6412, longitude: -13.5784 }, onSubmit });

      await user.type(screen.getByLabelText("Titre du produit"), "Pagne wax");
      await user.type(screen.getByLabelText("Description"), "Tissu wax authentique.");
      await user.type(screen.getByLabelText("Prix (GNF)"), "185000");
      await user.selectOptions(screen.getByLabelText("Catégorie"), "c1");
      await user.click(screen.getByRole("button", { name: "Publier le produit" }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(received).toEqual({
        titre: "Pagne wax",
        description: "Tissu wax authentique.",
        prix: 185000,
        categorieId: "c1",
        latitude: 9.6412,
        longitude: -13.5784,
      });
    });

    it("does not pre-fill and behaves like T65 when vendorLocation is absent", () => {
      renderForm();

      expect(
        screen.queryByText(
          "✓ Position de ton lieu de vente — tu peux la retirer ou la remplacer pour ce produit.",
        ),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("✓ Position enregistrée")).not.toBeInTheDocument();
      expect(
        screen.getByText("Sans position, ton produit n'apparaîtra pas dans le tri par distance."),
      ).toBeInTheDocument();
    });

    it("does not let vendorLocation override an explicit initialValues position (edition never receives vendorLocation, but this guards the precedence rule)", () => {
      renderForm({
        initialValues: { latitude: 1.111, longitude: 2.222 },
        vendorLocation: { latitude: 9.6412, longitude: -13.5784 },
      });

      // Position affichée = celle du produit (initialValues), pas celle du
      // compte : message standard, pas la mention lieu de vente.
      expect(screen.getByText("✓ Position enregistrée")).toBeInTheDocument();
      expect(
        screen.queryByText(
          "✓ Position de ton lieu de vente — tu peux la retirer ou la remplacer pour ce produit.",
        ),
      ).not.toBeInTheDocument();
    });

    it("switches to the standard « ✓ Position enregistrée » message once the vendor explicitly recaptures their position", async () => {
      stubGeolocation((success) => {
        success({ coords: { latitude: 1.0, longitude: 2.0 } } as GeolocationPosition);
      });
      const user = userEvent.setup();
      renderForm({ vendorLocation: { latitude: 9.6412, longitude: -13.5784 } });

      expect(
        screen.getByText(
          "✓ Position de ton lieu de vente — tu peux la retirer ou la remplacer pour ce produit.",
        ),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Je suis sur mon lieu de vente — utiliser ma position" }),
      );

      await waitFor(() => expect(screen.getByText("✓ Position enregistrée")).toBeInTheDocument());
      expect(
        screen.queryByText(
          "✓ Position de ton lieu de vente — tu peux la retirer ou la remplacer pour ce produit.",
        ),
      ).not.toBeInTheDocument();
    });

    it("clearing a vendorLocation-prefilled position returns to the T65 consequence message, and the account setting is untouched (only the form clears)", async () => {
      const user = userEvent.setup();
      renderForm({ vendorLocation: { latitude: 9.6412, longitude: -13.5784 } });

      await user.click(screen.getByRole("button", { name: "Retirer" }));

      expect(
        screen.queryByText(
          "✓ Position de ton lieu de vente — tu peux la retirer ou la remplacer pour ce produit.",
        ),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("Sans position, ton produit n'apparaîtra pas dans le tri par distance."),
      ).toBeInTheDocument();
    });
  });
});
