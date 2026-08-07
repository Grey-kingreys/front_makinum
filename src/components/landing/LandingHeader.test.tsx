import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicUser } from "@/lib/auth/types";

import { LandingHeader } from "./LandingHeader";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("@/lib/auth", () => ({ useAuth: useAuthMock }));

const DEMO_USER: PublicUser = {
  id: "u1",
  nom: "Fatoumata Bangoura",
  telephone: "+224622000000",
  telephoneVerifie: true,
  email: "fatoumata@exemple.gn",
  emailVerifie: true,
  role: "ACHETEUR",
  statutVendeur: "LIBRE",
  statutCompte: "ACTIF",
  latitude: null,
  longitude: null,
};

describe("LandingHeader", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("renders the Makinum logo linking to / , with the wordmark still shown as text (T41)", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: vi.fn(), refresh: vi.fn() });

    render(<LandingHeader />);

    const logoLink = screen.getByRole("link", { name: "Makinum" });
    expect(logoLink).toHaveAttribute("href", "/");
    // Le mot « Makinum » est un <span> texte à côté du SVG (le lien porte le
    // même nom accessible car le SVG de marque est aria-hidden, cf. Logo).
    expect(within(logoLink).getByText("Makinum")).toBeInTheDocument();
  });

  it("shows Connexion/Créer un compte (not Mon espace) when logged out", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: vi.fn(), refresh: vi.fn() });

    render(<LandingHeader />);

    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/connexion");
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute(
      "href",
      "/inscription",
    );
    expect(screen.queryByRole("link", { name: "Mon espace" })).not.toBeInTheDocument();
  });

  it("shows a single « Mon espace » button (not Connexion/Créer un compte) when logged in", () => {
    useAuthMock.mockReturnValue({
      user: DEMO_USER,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    render(<LandingHeader />);

    expect(screen.getByRole("link", { name: "Mon espace" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "Connexion" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Créer un compte" })).not.toBeInTheDocument();
  });

  it("defaults to the logged-out state while the session is still loading (no flash)", () => {
    useAuthMock.mockReturnValue({
      user: DEMO_USER,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    render(<LandingHeader />);

    expect(screen.getByRole("link", { name: "Connexion" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mon espace" })).not.toBeInTheDocument();
  });

  it("shows « Mon espace » in the mobile menu too when logged in", async () => {
    useAuthMock.mockReturnValue({
      user: DEMO_USER,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    const user = userEvent.setup();

    render(<LandingHeader />);
    await user.click(screen.getByRole("button", { name: "Menu" }));

    const mobileNav = document.getElementById("landing-mobile-nav");
    expect(mobileNav).not.toBeNull();
    expect(
      screen.getAllByRole("link", { name: "Mon espace" }).some((link) => mobileNav?.contains(link)),
    ).toBe(true);
    expect(
      screen.queryAllByRole("link", { name: "Connexion" }).some((link) => mobileNav?.contains(link)),
    ).toBe(false);
  });
});
