import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "./not-found";

describe("NotFound (404 racine, T63)", () => {
  it("renders the French title and links to the homepage and to /produits", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", {
        name: "Cette page n'existe pas ou n'est plus disponible.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Voir les produits" })).toHaveAttribute(
      "href",
      "/produits",
    );
  });
});
