import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getApiBaseUrl } from "@/lib/api";

import { GoogleAuthButton } from "./GoogleAuthButton";

describe("GoogleAuthButton", () => {
  it("links to GET /auth/google built from the same base URL as apiFetch", () => {
    render(<GoogleAuthButton />);

    const link = screen.getByRole("link", { name: /continuer avec google/i });
    expect(link).toHaveAttribute("href", `${getApiBaseUrl()}/auth/google`);
  });

  it("shows the 'ou' separator alongside the button", () => {
    render(<GoogleAuthButton />);

    expect(screen.getByText("ou")).toBeInTheDocument();
  });
});
