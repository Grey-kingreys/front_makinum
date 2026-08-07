import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "./Logo";

describe("Logo", () => {
  it("defaults to the couleur variant (vert + ambre) and announces itself as an image", () => {
    render(<Logo data-testid="logo" />);

    const svg = screen.getByRole("img", { name: "Makinum" });
    expect(svg).toBe(screen.getByTestId("logo"));
    expect(svg).toHaveAttribute("viewBox", "2 14 122 84");

    const [left, right] = svg.querySelectorAll("path");
    expect(left).toHaveAttribute("stroke", "#0F3D2E");
    expect(right).toHaveAttribute("stroke", "#E8A33D");
  });

  it("renders the mono variant with both strokes in the brand green", () => {
    render(<Logo variant="mono" data-testid="logo" />);

    const [left, right] = screen.getByTestId("logo").querySelectorAll("path");
    expect(left).toHaveAttribute("stroke", "#0F3D2E");
    expect(right).toHaveAttribute("stroke", "#0F3D2E");
  });

  it("renders the blanc variant with both strokes in cream (for a dark background)", () => {
    render(<Logo variant="blanc" data-testid="logo" />);

    const [left, right] = screen.getByTestId("logo").querySelectorAll("path");
    expect(left).toHaveAttribute("stroke", "#F7F4EE");
    expect(right).toHaveAttribute("stroke", "#F7F4EE");
  });

  it("renders the negatif variant with cream + amber strokes (for a dark background)", () => {
    render(<Logo variant="negatif" data-testid="logo" />);

    const [left, right] = screen.getByTestId("logo").querySelectorAll("path");
    expect(left).toHaveAttribute("stroke", "#F7F4EE");
    expect(right).toHaveAttribute("stroke", "#E8A33D");
  });

  it("hides itself from assistive tech and drops the accessible name when decorative (word « Makinum » shown as text nearby)", () => {
    render(<Logo decorative data-testid="logo" />);

    const svg = screen.getByTestId("logo");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
    expect(svg).not.toHaveAttribute("aria-label");
    expect(screen.queryByRole("img", { name: "Makinum" })).not.toBeInTheDocument();
  });

  it("forwards className so callers can size the mark via classes", () => {
    render(<Logo className="h-[30px] w-auto" data-testid="logo" />);

    expect(screen.getByTestId("logo")).toHaveClass("h-[30px]", "w-auto");
  });
});
