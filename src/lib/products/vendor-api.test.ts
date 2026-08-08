import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getApiBaseUrl } from "@/lib/api";
import { resetSession } from "@/lib/auth/session";

import {
  addProductPhoto,
  createProduct,
  deleteProductPhoto,
  getMyProducts,
  reorderProductPhotos,
  updateProduct,
} from "./vendor-api";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("vendor-api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    resetSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getMyProducts() calls GET /products/mine", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await getMyProducts();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/products/mine`);
    expect(init.method).toBe("GET");
  });

  it("createProduct() POSTs the JSON payload to /products", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "p1" }));

    await createProduct({
      titre: "Pagne wax",
      description: "Tissu wax authentique.",
      prix: 185000,
      categorieId: "c1",
      latitude: 9.6412,
      longitude: -13.5784,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/products`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      titre: "Pagne wax",
      description: "Tissu wax authentique.",
      prix: 185000,
      categorieId: "c1",
      latitude: 9.6412,
      longitude: -13.5784,
    });
  });

  it("updateProduct() PATCHes /products/:id, including `actif`", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "p1", actif: false }));

    await updateProduct("p1", { actif: false });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/products/p1`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ actif: false });
  });

  it("addProductPhoto() sends a multipart FormData with a `photo` field, no manual Content-Type", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "ph1", url: "x", urlMiniature: "y", ordre: 1 }));

    const file = new File(["binary"], "photo.jpg", { type: "image/jpeg" });
    await addProductPhoto("p1", file);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/products/p1/photos`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("photo")).toBe(file);
    const headers = init.headers as Headers;
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("deleteProductPhoto() calls DELETE /products/:id/photos/:photoId", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse(null));

    await deleteProductPhoto("p1", "ph1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/products/p1/photos/ph1`);
    expect(init.method).toBe("DELETE");
  });

  it("reorderProductPhotos() PATCHes /products/:id/photos/order with the photoIds array", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await reorderProductPhotos("p1", ["ph2", "ph1"]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/products/p1/photos/order`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ photoIds: ["ph2", "ph1"] });
  });
});
