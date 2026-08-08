import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getApiBaseUrl } from "@/lib/api";
import { resetSession } from "@/lib/auth/session";

import { createReview, listVendeurReviews } from "./api";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("reviews/api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    resetSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("createReview() POSTs { purchaseRequestId, note, commentaire } to /avis", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "r1" }));

    await createReview({ purchaseRequestId: "d1", note: 5, commentaire: "Impeccable" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/avis`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      purchaseRequestId: "d1",
      note: 5,
      commentaire: "Impeccable",
    });
  });

  it("createReview() omits commentaire when not provided", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "r1" }));

    await createReview({ purchaseRequestId: "d1", note: 4 });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ purchaseRequestId: "d1", note: 4 });
  });

  it("listVendeurReviews() calls GET /vendeurs/:id/avis with page/limit", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [], total: 0, page: 2, limit: 3, resume: { noteMoyenne: null, nbAvis: 0 } }),
    );

    await listVendeurReviews("v1", { page: 2, limit: 3 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/vendeurs/v1/avis?page=2&limit=3`);
    expect(init.method).toBe("GET");
  });

  it("listVendeurReviews() omits the query string when no params are given", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [], total: 0, page: 1, limit: 10, resume: { noteMoyenne: null, nbAvis: 0 } }),
    );

    await listVendeurReviews("v1");

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/vendeurs/v1/avis`);
  });
});
