import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import Page from "@/app/page";
import { AuthProvider } from "@/lib/auth";

// LandingHeader (rendu par Page) est auth-aware (useAuth()) : comme dans la
// vraie app (AuthProvider monté au root layout, src/app/layout.tsx), il faut
// un AuthProvider dans l'arbre. Sans jeton en localStorage, la session
// démarre déconnectée sans fetch (voir AuthProvider.tsx) : pas de mock réseau
// nécessaire ici.
function renderPage() {
  return render(
    <AuthProvider>
      <Page />
    </AuthProvider>,
  );
}

describe("Landing page", () => {
  beforeEach(() => {
    window.localStorage.clear();
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
