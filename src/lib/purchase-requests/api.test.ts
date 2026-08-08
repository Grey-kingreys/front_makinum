import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getApiBaseUrl } from "@/lib/api";
import { resetSession } from "@/lib/auth/session";

import {
  addPurchaseRequestItem,
  cancelPurchaseRequest,
  closePurchaseRequest,
  createOrCompletePurchaseRequest,
  getPurchaseRequest,
  listPurchaseRequests,
  removePurchaseRequestItem,
  sendPurchaseRequest,
  updatePurchaseRequestItemQuantity,
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
    resetSession();
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

  it("updatePurchaseRequestItemQuantity() PATCHes { quantite } to /demandes/:id/items/:produitId", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1" }));

    await updatePurchaseRequestItemQuantity("d1", "p1", 3);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes/d1/items/p1`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ quantite: 3 });
  });

  it("listPurchaseRequests('acheteur') calls GET /demandes?vue=acheteur", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await listPurchaseRequests("acheteur");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes?vue=acheteur`);
    expect(init.method).toBe("GET");
  });

  it("listPurchaseRequests('vendeur') calls GET /demandes?vue=vendeur", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await listPurchaseRequests("vendeur");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes?vue=vendeur`);
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

  it("sendPurchaseRequest() POSTs /demandes/:id/envoyer with no body when telephone is omitted", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1", statut: "ENVOYEE" }));

    await sendPurchaseRequest("d1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes/d1/envoyer`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  it("sendPurchaseRequest() POSTs { telephone } when provided (T36 — compte sans téléphone)", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1", statut: "ENVOYEE" }));

    await sendPurchaseRequest("d1", "+224622000000");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes/d1/envoyer`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ telephone: "+224622000000" });
  });

  it("cancelPurchaseRequest() POSTs /demandes/:id/annuler", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1", statut: "CLOTUREE" }));

    await cancelPurchaseRequest("d1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes/d1/annuler`);
    expect(init.method).toBe("POST");
  });

  it("closePurchaseRequest() POSTs { resultat } to /demandes/:id/cloturer", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1", statut: "CLOTUREE", resultat: "ABOUTIE" }));

    await closePurchaseRequest("d1", "ABOUTIE");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/demandes/d1/cloturer`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ resultat: "ABOUTIE" });
  });
});
