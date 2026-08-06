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
    expect(screen.getByText(/9\.6412, -13\.5784/)).toBeInTheDocument();
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

  it("fills latitude/longitude after clicking « Utiliser ma position »", async () => {
    stubGeolocation((success) => {
      success({ coords: { latitude: 9.6412, longitude: -13.5784 } } as GeolocationPosition);
    });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Utiliser ma position" }));

    await waitFor(() => expect(screen.getByText(/9\.6412, -13\.5784/)).toBeInTheDocument());
  });

  it("clears the position when « Retirer » is clicked", async () => {
    const user = userEvent.setup();
    renderForm({
      initialValues: { latitude: 9.6412, longitude: -13.5784 },
    });

    await user.click(screen.getByRole("button", { name: "Retirer" }));

    expect(screen.queryByText(/9\.6412, -13\.5784/)).not.toBeInTheDocument();
  });
});
