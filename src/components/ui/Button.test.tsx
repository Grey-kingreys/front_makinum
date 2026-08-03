import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders its children and defaults to type=button + the primary variant", () => {
    render(<Button>Se connecter</Button>);

    const button = screen.getByRole("button", { name: "Se connecter" });
    expect(button).toHaveAttribute("type", "button");
    expect(button.className).toContain("bg-brand");
  });

  it("applies the accent (ambre) variant classes", () => {
    render(<Button variant="accent">Créer un compte</Button>);

    const button = screen.getByRole("button", { name: "Créer un compte" });
    expect(button.className).toContain("bg-accent");
    expect(button.className).toContain("text-brand");
  });

  it("applies the outline variant classes", () => {
    render(<Button variant="outline">Annuler</Button>);

    const button = screen.getByRole("button", { name: "Annuler" });
    expect(button.className).toContain("border-border-strong");
  });

  it("forwards the disabled state and native button attributes", () => {
    render(<Button disabled>Envoyer</Button>);

    const button = screen.getByRole("button", { name: "Envoyer" });
    expect(button).toBeDisabled();
  });

  it("lets the caller override the button type (e.g. submit)", () => {
    render(<Button type="submit">Valider</Button>);

    expect(screen.getByRole("button", { name: "Valider" })).toHaveAttribute("type", "submit");
  });
});
