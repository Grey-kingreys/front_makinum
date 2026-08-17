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

  it("links the footer legal notices to /cgu and /confidentialite", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "CGU" })).toHaveAttribute("href", "/cgu");
    expect(screen.getByRole("link", { name: "Confidentialité" })).toHaveAttribute("href", "/confidentialite");
  });
});
