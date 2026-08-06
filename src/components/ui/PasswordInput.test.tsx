import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { PasswordInput } from "@/components/ui/PasswordInput";

describe("PasswordInput", () => {
  it("renders masked by default with an accessible, non-submitting toggle button", () => {
    render(<PasswordInput label="Mot de passe" />);

    const field = screen.getByLabelText("Mot de passe");
    const toggle = screen.getByRole("button", { name: "Afficher le mot de passe" });

    expect(field).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("switches type=password to type=text and flips aria-pressed/aria-label on click", async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Mot de passe" />);

    const field = screen.getByLabelText("Mot de passe");
    await user.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));

    expect(field).toHaveAttribute("type", "text");
    const toggle = screen.getByRole("button", { name: "Masquer le mot de passe" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    await user.click(toggle);

    expect(field).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Afficher le mot de passe" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("does not submit the enclosing form when the toggle is clicked", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn((event: FormEvent) => event.preventDefault());

    render(
      <form onSubmit={handleSubmit}>
        <PasswordInput label="Mot de passe" />
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("forwards error/hint props from the underlying Input primitive", () => {
    render(<PasswordInput label="Confirmer le mot de passe" error="Les mots de passe ne correspondent pas." />);

    const field = screen.getByLabelText("Confirmer le mot de passe");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Les mots de passe ne correspondent pas.")).toBeInTheDocument();
  });
});
