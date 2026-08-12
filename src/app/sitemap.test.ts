import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import sitemap from "./sitemap";

const { searchProductsMock, listVendorsMock } = vi.hoisted(() => ({
  searchProductsMock: vi.fn(),
  listVendorsMock: vi.fn(),
}));

vi.mock("@/lib/products/api", () => ({ searchProducts: searchProductsMock }));
vi.mock("@/lib/vendors/api", () => ({ listVendors: listVendorsMock }));

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const SITE_URL = "https://makinum.kingreys.fr";
const STATIC_PATHS = ["/", "/produits", "/vendeurs", "/cgu", "/confidentialite"];

function page(items: Array<{ id: string }>, total: number) {
  return { items, total, page: 1, limit: 50 };
}

function makeIds(prefix: string, count: number): Array<{ id: string }> {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i}` }));
}

describe("sitemap", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;
    searchProductsMock.mockReset();
    listVendorsMock.mockReset();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  });

  it("always includes the static public pages", async () => {
    searchProductsMock.mockResolvedValue(page([], 0));
    listVendorsMock.mockResolvedValue(page([], 0));

    const result = await sitemap();
    const urls = result.map((entry) => entry.url);

    for (const path of STATIC_PATHS) {
      expect(urls).toContain(`${SITE_URL}${path}`);
    }
  });

  it("includes an entry for every product and vendor returned by the API, with no lastModified", async () => {
    searchProductsMock.mockResolvedValueOnce(page(makeIds("p", 2), 2));
    listVendorsMock.mockResolvedValueOnce(page(makeIds("v", 3), 3));

    const result = await sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toContain(`${SITE_URL}/produits/p0`);
    expect(urls).toContain(`${SITE_URL}/produits/p1`);
    expect(urls).toContain(`${SITE_URL}/vendeurs/v0`);
    expect(urls).toContain(`${SITE_URL}/vendeurs/v1`);
    expect(urls).toContain(`${SITE_URL}/vendeurs/v2`);
    // Aucune date n'est exposée par l'API (ProductSearchItem/VendorListItem) : pas de lastModified inventé.
    for (const entry of result) {
      expect(entry.lastModified).toBeUndefined();
    }
  });

  it("loops across pages until a short page is returned", async () => {
    searchProductsMock
      .mockResolvedValueOnce({ items: makeIds("p", 50), total: 120, page: 1, limit: 50 })
      .mockResolvedValueOnce({ items: makeIds("q", 50), total: 120, page: 2, limit: 50 })
      .mockResolvedValueOnce({ items: makeIds("r", 20), total: 120, page: 3, limit: 50 });
    listVendorsMock.mockResolvedValue(page([], 0));

    const result = await sitemap();
    const productUrls = result.filter((entry) => entry.url.includes("/produits/"));

    expect(searchProductsMock).toHaveBeenCalledTimes(3);
    expect(productUrls).toHaveLength(120);
  });

  it("stops looping once every item announced by `total` has been collected, even on a full last page", async () => {
    searchProductsMock
      .mockResolvedValueOnce({ items: makeIds("p", 50), total: 100, page: 1, limit: 50 })
      .mockResolvedValueOnce({ items: makeIds("q", 50), total: 100, page: 2, limit: 50 });
    listVendorsMock.mockResolvedValue(page([], 0));

    const result = await sitemap();
    const productUrls = result.filter((entry) => entry.url.includes("/produits/"));

    expect(searchProductsMock).toHaveBeenCalledTimes(2);
    expect(productUrls).toHaveLength(100);
  });

  it("stops after a bounded number of pages even if the API keeps returning full pages (safety bound)", async () => {
    searchProductsMock.mockImplementation(async ({ page: p }: { page: number }) => ({
      items: makeIds(`p${p}-`, 50),
      total: Number.MAX_SAFE_INTEGER,
      page: p,
      limit: 50,
    }));
    listVendorsMock.mockResolvedValue(page([], 0));

    const result = await sitemap();

    // Borne de sécurité de sitemap.ts : 200 pages maximum.
    expect(searchProductsMock).toHaveBeenCalledTimes(200);
    const productUrls = result.filter((entry) => entry.url.includes("/produits/"));
    expect(productUrls).toHaveLength(200 * 50);
  });

  it("falls back to the static entries only when the API is unreachable", async () => {
    searchProductsMock.mockRejectedValue(new Error("fetch failed"));
    listVendorsMock.mockResolvedValue(page([], 0));

    const result = await sitemap();

    expect(result).toHaveLength(STATIC_PATHS.length);
    expect(result.map((entry) => entry.url)).toEqual(STATIC_PATHS.map((path) => `${SITE_URL}${path}`));
  });

  it("falls back to the static entries only when the vendors API errors, even if products succeeded", async () => {
    searchProductsMock.mockResolvedValue(page(makeIds("p", 5), 5));
    listVendorsMock.mockRejectedValue(new Error("500"));

    const result = await sitemap();

    expect(result).toHaveLength(STATIC_PATHS.length);
    expect(result.some((entry) => entry.url.includes("/produits/"))).toBe(false);
  });
});
