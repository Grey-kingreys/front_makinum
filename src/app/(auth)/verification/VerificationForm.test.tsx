import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VerificationForm } from "./VerificationForm";

type FetchMock = ReturnType<typeof vi.fn>;

const { pushMock, useSearchParamsMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  useSearchParamsMock: vi.fn(() => new URLSearchParams("email=fatoumata%40exemple.gn")),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: useSearchParamsMock,
}));

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("VerificationForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    pushMock.mockClear();
    useSearchParamsMock.mockReturnValue(new URLSearchParams("email=fatoumata%40exemple.gn"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls verify-email (no token) with the code and email from the query, then redirects", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Email vérifié" }));

    render(<VerificationForm />);

    await user.type(screen.getByLabelText("Code reçu par email"), "123456");
    await user.click(screen.getByRole("button", { name: "Valider le code" }));

    const [url, init] = await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      return fetchMock.mock.calls[0] as [string, RequestInit];
    });
    expect(url).toContain("/auth/otp/verify-email");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "fatoumata@exemple.gn",
      code: "123456",
    });
    // Route publique : aucun jeton requis.
    expect((init.headers as Headers | undefined)?.get?.("Authorization")).toBeFalsy();

    expect(await screen.findByRole("status")).toHaveTextContent("Email vérifié");
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/connexion"), { timeout: 5000 });
  });

  it("shows INVALID_OTP as a proper error message", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: "INVALID_OTP", message: "Code invalide ou expiré" }, { ok: false, status: 400 }),
    );

    render(<VerificationForm />);

    await user.type(screen.getByLabelText("Code reçu par email"), "000000");
    await user.click(screen.getByRole("button", { name: "Valider le code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Code invalide ou expiré.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("requests a new OTP (usage VERIFY_EMAIL) via 'Renvoyer le code'", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        message: "Si un compte correspond à cet identifiant, un code de vérification vient d'être envoyé.",
      }),
    );

    render(<VerificationForm />);

    await user.click(screen.getByRole("button", { name: "Renvoyer le code" }));

    const [url, init] = await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      return fetchMock.mock.calls[0] as [string, RequestInit];
    });
    expect(url).toContain("/auth/otp/request");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "fatoumata@exemple.gn",
      usage: "VERIFY_EMAIL",
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "un code de vérification vient d'être envoyé",
    );
  });

  it("shows RATE_LIMITED when resending too fast", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "RATE_LIMITED", message: "Trop de tentatives. Réessayez plus tard." },
        { ok: false, status: 429 },
      ),
    );

    render(<VerificationForm />);
    await user.click(screen.getByRole("button", { name: "Renvoyer le code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Trop de tentatives, réessaie dans un moment.",
    );
  });

  it("shows a warning and no form when the email query param is missing", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

    render(<VerificationForm />);

    expect(screen.getByRole("alert")).toHaveTextContent("Email manquant");
    expect(screen.queryByLabelText("Code reçu par email")).not.toBeInTheDocument();
  });
});
