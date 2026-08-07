import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import VendeurNotFound from "./not-found";

describe("VendeurNotFound", () => {
  it("renders a clean 'vendeur introuvable' page with a link back to /vendeurs", () => {
    render(<VendeurNotFound />);

    expect(screen.getByRole("heading", { name: "Vendeur introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /vendeurs/i })).toHaveAttribute("href", "/vendeurs");
  });
});
