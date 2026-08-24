import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import HorsLignePage, { metadata } from "./page";

describe("HorsLignePage (T67①)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the offline message and a retry button, without indexing the page", () => {
    render(<HorsLignePage />);

    expect(screen.getByRole("heading", { name: "Pas de connexion" })).toBeInTheDocument();
    expect(
      screen.getByText(/Vérifie ton réseau et réessaie/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("reloads the page when the retry button is clicked", async () => {
    const reload = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });

    render(<HorsLignePage />);
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(reload).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
});
