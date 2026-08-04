import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Page from "@/app/page";

describe("Landing page", () => {
  it("renders the hero heading", () => {
    render(<Page />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/Ce qui se vend/);
    expect(heading).toHaveTextContent(/près de chez toi/);
    expect(heading).toHaveTextContent(/enfin visible\./);
  });

  it("links Connexion to /connexion", () => {
    render(<Page />);

    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/connexion");
  });

  it("links the signup and become-a-seller CTAs to /inscription", () => {
    render(<Page />);

    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/inscription");
    expect(screen.getByRole("link", { name: "Je veux vendre" })).toHaveAttribute("href", "/inscription");
    expect(screen.getByRole("link", { name: "Devenir vendeur" })).toHaveAttribute("href", "/inscription");
  });

  it("links the footer legal notices to /cgu and /confidentialite", () => {
    render(<Page />);

    expect(screen.getByRole("link", { name: "CGU" })).toHaveAttribute("href", "/cgu");
    expect(screen.getByRole("link", { name: "Confidentialité" })).toHaveAttribute("href", "/confidentialite");
  });
});
