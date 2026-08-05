import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InscriptionForm } from "./InscriptionForm";

type FetchMock = ReturnType<typeof vi.fn>;

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "fatoumata@exemple.gn");
  await user.type(screen.getByLabelText("Mot de passe"), "secret123");
  await user.type(screen.getByLabelText("Nom affiché"), "Fatoumata Bangoura");
}

describe("InscriptionForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    pushMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers as ACHETEUR by default (telephone optional) and redirects to /verification?email=… on success", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ user: { id: "u1" }, message: "Compte créé." }),
    );

    render(<InscriptionForm />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/verification?email=fatoumata%40exemple.gn"),
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/register");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      nom: "Fatoumata Bangoura",
      email: "fatoumata@exemple.gn",
      motDePasse: "secret123",
      role: "ACHETEUR",
    });
    expect(body.telephone).toBeUndefined();
  });

  it("marks the phone field required and adds the contact-channel hint when 'Devenir vendeur' is selected", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ user: { id: "u1" }, message: "Compte créé." }),
    );

    render(<InscriptionForm />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("radio", { name: "Devenir vendeur" }));

    const phoneField = screen.getByLabelText("Numéro de téléphone");
    expect(phoneField).toBeRequired();
    expect(
      screen.getByText("Ton numéro sera visible par les acheteurs pour te contacter."),
    ).toBeInTheDocument();

    await user.type(phoneField, "+224622000000");
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      role: "VENDEUR",
      telephone: "+224622000000",
    });
  });

  it("does not submit when 'Devenir vendeur' is selected and the phone number is left blank", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;

    render(<InscriptionForm />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("radio", { name: "Devenir vendeur" }));
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a dedicated message on VENDOR_PHONE_REQUIRED (400)", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          code: "VENDOR_PHONE_REQUIRED",
          message:
            "Un numéro de téléphone est obligatoire pour un compte vendeur : c'est votre canal de contact avec les acheteurs",
        },
        { ok: false, status: 400 },
      ),
    );

    render(<InscriptionForm />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("radio", { name: "Devenir vendeur" }));
    await user.type(screen.getByLabelText("Numéro de téléphone"), "+224622000000");
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Un numéro de téléphone est obligatoire pour un compte vendeur",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a dedicated message when the email is already used (409)", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "EMAIL_ALREADY_USED", message: "Cet email est déjà utilisé" },
        { ok: false, status: 409 },
      ),
    );

    render(<InscriptionForm />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Cet email est déjà utilisé.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a dedicated message when the phone number is already used (409)", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "PHONE_ALREADY_USED", message: "Ce numéro de téléphone est déjà utilisé" },
        { ok: false, status: 409 },
      ),
    );

    render(<InscriptionForm />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("radio", { name: "Devenir vendeur" }));
    await user.type(screen.getByLabelText("Numéro de téléphone"), "+224622000000");
    await user.click(screen.getByRole("button", { name: "Recevoir mon code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ce numéro de téléphone est déjà utilisé.",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
