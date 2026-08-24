import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Page from "@/app/aide/page";

describe("Aide page", () => {
  it("renders the main heading", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Aide",
      }),
    ).toBeInTheDocument();
  });

  it("renders the four main sections", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Comment acheter",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Comment vendre",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Installer l'application",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Nous contacter",
      }),
    ).toBeInTheDocument();
  });

  it("renders WhatsApp link with correct URL", () => {
    render(<Page />);

    const whatsappLink = screen.getByRole("link", {
      name: /Écris-nous sur WhatsApp/i,
    });

    expect(whatsappLink).toHaveAttribute("href", "https://wa.me/224624815998");
    expect(whatsappLink).toHaveAttribute("target", "_blank");
  });

  it("displays WhatsApp number", () => {
    render(<Page />);

    expect(screen.getByText("+224 624 81 59 98")).toBeInTheDocument();
  });

  it("renders email link with correct mailto", () => {
    render(<Page />);

    const emailLink = screen.getByRole("link", {
      name: /soulmamoudou0@gmail\.com/,
    });

    expect(emailLink).toHaveAttribute("href", "mailto:soulmamoudou0@gmail.com");
  });

  it("renders footer with Aide link", () => {
    render(<Page />);

    const aideLink = screen.getByRole("link", { name: "Aide" });
    expect(aideLink).toHaveAttribute("href", "/aide");
  });

  it("renders footer with CGU and Confidentialité links", () => {
    render(<Page />);

    const cguLink = screen.getByRole("link", { name: "CGU" });
    const confidentialiteLink = screen.getByRole("link", { name: "Confidentialité" });

    expect(cguLink).toHaveAttribute("href", "/cgu");
    expect(confidentialiteLink).toHaveAttribute("href", "/confidentialite");
  });
});
