import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getApiBaseUrl } from "@/lib/api";
import { resetSession } from "@/lib/auth/session";

import { updateVendorSettings } from "./api";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("vendor-settings/api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    resetSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updateVendorSettings({ autoriseAdminPublication: true }) PATCHes /vendeur/parametres with autoriseAdminPublication: true", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "v1", autoriseAdminPublication: true }));

    await updateVendorSettings({ autoriseAdminPublication: true });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/vendeur/parametres`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ autoriseAdminPublication: true });
  });

  it("updateVendorSettings({ autoriseAdminPublication: false }) PATCHes with autoriseAdminPublication: false", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "v1", autoriseAdminPublication: false }));

    await updateVendorSettings({ autoriseAdminPublication: false });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ autoriseAdminPublication: false });
  });

  it("updateVendorSettings({ lieuVente }) PATCHes /vendeur/parametres with the coordinates", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "v1", lieuVente: { latitude: 9.6412, longitude: -13.5784 } }),
    );

    await updateVendorSettings({ lieuVente: { latitude: 9.6412, longitude: -13.5784 } });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/vendeur/parametres`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      lieuVente: { latitude: 9.6412, longitude: -13.5784 },
    });
  });

  it("updateVendorSettings({ lieuVente: null }) PATCHes with lieuVente: null (retrait)", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "v1", lieuVente: null }));

    await updateVendorSettings({ lieuVente: null });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ lieuVente: null });
  });
});
