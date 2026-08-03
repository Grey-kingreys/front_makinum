import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Page from "@/app/page";

describe("Home page", () => {
  it("renders the getting started heading", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "To get started, edit the page.tsx file.",
      }),
    ).toBeInTheDocument();
  });

  it("renders a link to the Next.js documentation", () => {
    render(<Page />);

    const docsLink = screen.getByRole("link", { name: "Documentation" });
    expect(docsLink).toHaveAttribute(
      "href",
      "https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app",
    );
  });
});
