import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Page from "@/app/cgu/page";

describe("CGU page", () => {
  it("renders the main heading", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Conditions générales d'utilisation",
      }),
    ).toBeInTheDocument();
  });

  it("does not render the legal review notice", () => {
    render(<Page />);

    expect(
      screen.queryByText(
        "Document de travail — à faire relire par un conseil juridique avant mise en production.",
      ),
    ).not.toBeInTheDocument();
  });

  it("renders a link back to the home page", () => {
    render(<Page />);

    expect(screen.getByRole("link", { name: /retour à l'accueil/i })).toHaveAttribute("href", "/");
  });
});
