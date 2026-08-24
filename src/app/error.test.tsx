import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ErrorPage from "./error";

describe("ErrorPage (limite d'erreur racine, T63)", () => {
  it("renders the French message and no technical detail, and calls reset() from the retry button", async () => {
    const reset = vi.fn();
    const error = Object.assign(new Error("boom — détail technique"), { digest: "abc123" });

    render(<ErrorPage error={error} reset={reset} />);

    expect(screen.getByRole("heading", { name: "Un problème est survenu." })).toBeInTheDocument();
    expect(screen.getByText("Réessaie.")).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    expect(screen.queryByText(/abc123/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
