import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, ApiError, getApiBaseUrl } from "@/lib/api";
import { clearToken, setToken } from "@/lib/auth/token";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    clearToken();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses NEXT_PUBLIC_API_URL as the default base URL", () => {
    expect(getApiBaseUrl()).toBe(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");
  });

  it("resolves with the parsed JSON body on success", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ hello: "world" }));

    const data = await apiFetch<{ hello: string }>("/ping");

    expect(data).toEqual({ hello: "world" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/ping`);
  });

  it("throws an ApiError carrying the backend status/code/message on failure", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "INVALID_CREDENTIALS", message: "Identifiant ou mot de passe incorrect" },
        { ok: false, status: 401 },
      ),
    );

    const promise = apiFetch("/auth/login", { method: "POST", body: {} });

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Identifiant ou mot de passe incorrect",
    });
  });

  it("surfaces PHONE_NOT_VERIFIED / ACCOUNT_SUSPENDED style backend errors", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "PHONE_NOT_VERIFIED", message: "Numéro de téléphone non vérifié" },
        { ok: false, status: 403 },
      ),
    );

    await expect(apiFetch("/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 403,
      code: "PHONE_NOT_VERIFIED",
    });
  });

  it("falls back to a generic ApiError when the network request itself fails", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(apiFetch("/ping")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });

  it("injects the Authorization: Bearer header when a token is stored", async () => {
    setToken("test-token-123");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "u1" }));

    await apiFetch("/auth/me");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token-123");
  });

  it("does not inject Authorization when no token is stored", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch("/public/ping");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });

  it("skips the Authorization header when skipAuth is set, even with a token stored", async () => {
    setToken("test-token-123");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ accessToken: "x", user: {} }));

    await apiFetch("/auth/login", { method: "POST", body: {}, skipAuth: true });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });
});
