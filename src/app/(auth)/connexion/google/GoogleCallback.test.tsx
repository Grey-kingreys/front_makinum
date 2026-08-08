import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { GoogleCallback } from "./GoogleCallback";

const { replaceMock, useSearchParamsMock, refreshSessionMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
  refreshSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, refreshSession: refreshSessionMock };
});

const DEMO_SESSION = {
  accessToken: "fresh-token",
  user: {
    id: "u1",
    nom: "Fatoumata Bangoura",
    telephone: null,
    telephoneVerifie: false,
    email: "fatoumata@exemple.gn",
    emailVerifie: true,
    role: "ACHETEUR" as const,
    statutVendeur: "LIBRE" as const,
    statutCompte: "ACTIF" as const,
    vendeurValide: false,
    latitude: null,
    longitude: null,
  },
};

describe("GoogleCallback", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    refreshSessionMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("without ?erreur : calls refreshSession (POST /auth/refresh) and redirects to /dashboard", async () => {
    refreshSessionMock.mockResolvedValueOnce(DEMO_SESSION);

    render(<GoogleCallback />);

    expect(screen.getByRole("status")).toHaveTextContent("Connexion avec Google en cours");
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("treats a failed refresh (no ?erreur announced) as the 'google' error, without redirecting", async () => {
    refreshSessionMock.mockRejectedValueOnce(
      new ApiError(401, "Session expirée", "INVALID_REFRESH_TOKEN"),
    );

    render(<GoogleCallback />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La connexion avec Google a échoué",
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("?erreur=refus : shows a non-alarming cancellation message, without calling refreshSession", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("erreur=refus"));

    render(<GoogleCallback />);

    expect(screen.getByRole("status")).toHaveTextContent("refusé l'accès");
    expect(refreshSessionMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("?erreur=email_non_verifie : shows the unverified-email message, without calling refreshSession", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("erreur=email_non_verifie"));

    render(<GoogleCallback />);

    expect(screen.getByRole("alert")).toHaveTextContent("n'est pas vérifiée");
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });

  it("?erreur=compte_suspendu : reuses the suspended-account wording, without calling refreshSession", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("erreur=compte_suspendu"));

    render(<GoogleCallback />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ce compte est suspendu. Contacte l'équipe Makinum pour plus d'informations.",
    );
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });

  it("?erreur=google : shows the technical-failure message, without calling refreshSession", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("erreur=google"));

    render(<GoogleCallback />);

    expect(screen.getByRole("alert")).toHaveTextContent("échoué (problème technique)");
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });

  it("always offers a link back to /connexion on error", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("erreur=google"));

    render(<GoogleCallback />);

    expect(screen.getByRole("link", { name: "Retour à la connexion" })).toHaveAttribute(
      "href",
      "/connexion",
    );
  });
});
