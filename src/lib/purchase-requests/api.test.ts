import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getApiBaseUrl } from "@/lib/api";
import { clearToken } from "@/lib/auth/token";

import {
  addPurchaseRequestItem,
  cancelPurchaseRequest,
  createOrCompletePurchaseRequest,
  getPurchaseRequest,
  listPurchaseRequests,
  removePurchaseRequestItem,
  sendPurchaseRequest,
} from "./api";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("purchase-requests/api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    clearToken();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("createOrCompletePurchaseRequest() POSTs { produitId, quantite } to /demandes", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1" }));

    await createOrCompletePurchaseRequest({ produitId: "p1", quantite: 2 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ produitId: "p1", quantite: 2 });
  });

  it("createOrCompletePurchaseRequest() omits quantite when not provided", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1" }));

    await createOrCompletePurchaseRequest({ produitId: "p1" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ produitId: "p1" });
  });

  it("addPurchaseRequestItem() POSTs to /demandes/:id/items", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1" }));

    await addPurchaseRequestItem("d1", { produitId: "p1", quantite: 1 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes/d1/items`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ produitId: "p1", quantite: 1 });
  });

  it("removePurchaseRequestItem() DELETEs /demandes/:id/items/:produitId", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ demande: null }));

    const result = await removePurchaseRequestItem("d1", "p1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes/d1/items/p1`);
    expect(init.method).toBe("DELETE");
    expect(result).toEqual({ demande: null });
  });

  it("listPurchaseRequests() calls GET /demandes", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await listPurchaseRequests();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes`);
    expect(init.method).toBe("GET");
  });

  it("getPurchaseRequest() calls GET /demandes/:id", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1" }));

    await getPurchaseRequest("d1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes/d1`);
    expect(init.method).toBe("GET");
  });

  it("sendPurchaseRequest() POSTs /demandes/:id/envoyer", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1", statut: "ENVOYEE" }));

    await sendPurchaseRequest("d1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes/d1/envoyer`);
    expect(init.method).toBe("POST");
  });

  it("cancelPurchaseRequest() POSTs /demandes/:id/annuler", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1", statut: "CLOTUREE" }));

    await cancelPurchaseRequest("d1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes/d1/annuler`);
    expect(init.method).toBe("POST");
  });
});
