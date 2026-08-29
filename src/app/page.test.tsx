import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Page from "@/app/page";
import { ApiError } from "@/lib/api";
import { AuthProvider, resetSession } from "@/lib/auth";

const { refreshSessionMock } = vi.hoisted(() => ({ refreshSessionMock: vi.fn() }));

// T28 : l'AuthProvider restaure la session au montage via POST /auth/refresh.
// La landing se rend pour un visiteur anonyme — on neutralise l'appel plutôt
// que de monter un mock réseau ici.
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, refreshSession: refreshSessionMock };
});

// CategoryGrid (rendu par Page) est un composant serveur async (T31b, fetch
// GET /categories) — le renderer client de react-dom utilisé par Testing
// Library ne sait pas monter un composant async hors pipeline RSC. Son
// comportement (données, repli statique) est déjà couvert par
// CategoryGrid.test.tsx ; ici on le remplace par un stub synchrone pour ne
// tester que le reste de la landing.
vi.mock("@/components/landing/CategoryGrid", () => ({
  CategoryGrid: () => null,
}));

// FeaturedProducts (rendu par Page, T58) est lui aussi un composant serveur
// async (fetch GET /products?limit=8) — même raison, même traitement : stub
// synchrone ici, comportement (données, masquage) couvert par
// FeaturedProducts.test.tsx.
vi.mock("@/components/landing/FeaturedProducts", () => ({
  FeaturedProducts: () => null,
}));

// LandingHeader (rendu par Page) est auth-aware (useAuth()) : comme dans la
// vraie app (AuthProvider monté au root layout, src/app/layout.tsx), il faut
// un AuthProvider dans l'arbre. Le rafraîchissement de session étant neutralisé
// ci-dessus, la session démarre et reste déconnectée.
function renderPage() {
  return render(
    <AuthProvider>
      <Page />
    </AuthProvider>,
  );
}

describe("Landing page", () => {
  beforeEach(() => {
    resetSession();
    refreshSessionMock.mockReset();
    refreshSessionMock.mockRejectedValue(
      new ApiError(401, "Session expirée", "INVALID_REFRESH_TOKEN"),
    );
  });

  it("renders the hero heading", () => {
    renderPage();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/Ce qui se vend/);
    expect(heading).toHaveTextContent(/près de chez toi/);
    expect(heading).toHaveTextContent(/enfin visible\./);
  });

  it("links Connexion to /connexion", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/connexion");
  });

  it("links the signup and become-a-seller CTAs to /inscription", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/inscription");
    expect(screen.getByRole("link", { name: "Je veux vendre" })).toHaveAttribute("href", "/inscription");
    expect(screen.getByRole("link", { name: "Devenir vendeur" })).toHaveAttribute("href", "/inscription");
  });

  it("links the footer legal notices to /aide, /cgu and /confidentialite", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Aide" })).toHaveAttribute("href", "/aide");
    expect(screen.getByRole("link", { name: "CGU" })).toHaveAttribute("href", "/cgu");
    expect(screen.getByRole("link", { name: "Confidentialité" })).toHaveAttribute("href", "/confidentialite");
  });

  // T71 : JSON-LD WebSite (avec SearchAction, pour le sitelink de recherche
  // Google) + Organization, injectés en <script type="application/ld+json">
  // sur la landing.
  it("renders a JSON-LD WebSite script with a SearchAction targeting /produits?q=", () => {
    const { container } = renderPage();

    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    const website = Array.from(scripts)
      .map((script) => JSON.parse(script.textContent ?? "{}"))
      .find((data) => data["@type"] === "WebSite");

    expect(website).toBeDefined();
    expect(website).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Makinum",
      url: "http://localhost:3000",
      potentialAction: {
        "@type": "SearchAction",
        target: "http://localhost:3000/produits?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    });
  });

  it("renders a JSON-LD Organization script", () => {
    const { container } = renderPage();

    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    const organization = Array.from(scripts)
      .map((script) => JSON.parse(script.textContent ?? "{}"))
      .find((data) => data["@type"] === "Organization");

    expect(organization).toBeDefined();
    expect(organization).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Makinum",
      url: "http://localhost:3000",
      logo: "http://localhost:3000/icons/icon-512.png",
    });
  });
});
