import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GeoProvider } from "@/lib/geo";
import { formatPrixGNF } from "@/lib/format";
import type { CategoryListItem } from "@/lib/categories/types";
import type { ProductSearchItem, ProductSearchResult } from "@/lib/products/types";

import { ProduitsView } from "./ProduitsView";

type FetchMock = ReturnType<typeof vi.fn>;

/** jest-dom/testing-library normalize whitespace to a plain space before
 * matching — Intl's fr-FR grouping separator (U+202F) must be normalized
 * the same way in expected values, or an exact/contains match never lines up. */
function normalizeSpaces(value: string): string {
  return value.replace(/ /g, " ");
}

const { useSearchParamsMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/navigation", () => ({
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

const CATEGORIES: CategoryListItem[] = [
  { id: "c1", nom: "Mode & tissus", slug: "mode-tissus", parentId: null },
  { id: "c2", nom: "Électronique", slug: "electronique", parentId: null },
];

function makeItem(overrides: Partial<ProductSearchItem> = {}): ProductSearchItem {
  return {
    id: "p1",
    titre: "Pagne wax 6 yards",
    prix: "185000",
    latitude: 9.6,
    longitude: -13.6,
    distanceKm: 0.8,
    miniature: null,
    categorie: { nom: "Mode & tissus", slug: "mode-tissus" },
    vendeur: { id: "v1", nom: "Fatoumata B.", statutVendeur: "VERIFIE", noteMoyenne: 4.6, nbAvis: 23 },
    ...overrides,
  };
}

function searchResult(items: ProductSearchItem[], total?: number): ProductSearchResult {
  return { items, total: total ?? items.length, page: 1, limit: 20 };
}

/** Route le fetch mock par URL — évite toute hypothèse d'ordre entre les deux
 * effets indépendants (GET /categories, GET /products). */
function setupFetch(opts: {
  categories?: CategoryListItem[];
  products?: ProductSearchResult;
}): FetchMock {
  const fetchMock = vi.fn((url: string) => {
    if (url.includes("/categories")) {
      return Promise.resolve(jsonResponse(opts.categories ?? []));
    }
    if (url.includes("/products")) {
      return Promise.resolve(jsonResponse(opts.products ?? searchResult([])));
    }
    return Promise.resolve(jsonResponse({}));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Renvoie l'URL du DERNIER appel /products — la géoloc peut déclencher un
 * premier fetch sans position (idle) suivi d'un second une fois la position
 * résolue ; seul le dernier reflète l'état final. */
function productsCallUrl(fetchMock: FetchMock): URL {
  const calls = fetchMock.mock.calls.filter(
    ([url]) => String(url).includes("/products?") || String(url).endsWith("/products"),
  );
  if (calls.length === 0) throw new Error("no /products call recorded");
  return new URL(String(calls[calls.length - 1][0]));
}

function stubGeolocationSuccess(lat: number, lng: number) {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (success: PositionCallback) => {
        success({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition);
      },
    },
  });
}

function stubGeolocationDenied() {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: "denied" } as GeolocationPositionError);
      },
    },
  });
}

function renderView() {
  return render(
    <GeoProvider>
      <ProduitsView />
    </GeoProvider>,
  );
}

describe("ProduitsView", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends lat/lng/tri=proche/rayon=25 when a position is already stored", async () => {
    window.sessionStorage.setItem("makinum.position", JSON.stringify({ lat: 9.6, lng: -13.6 }));
    const fetchMock = setupFetch({ categories: CATEGORIES, products: searchResult([makeItem()]) });

    renderView();

    await waitFor(() => expect(productsCallUrl(fetchMock)).toBeDefined());
    const url = productsCallUrl(fetchMock);
    expect(url.searchParams.get("lat")).toBe("9.6");
    expect(url.searchParams.get("lng")).toBe("-13.6");
    expect(url.searchParams.get("tri")).toBe("proche");
    expect(url.searchParams.get("rayon")).toBe("25");
  });

  it("falls back to tri=recent with no lat/lng/rayon when geolocation is denied, and shows the banner", async () => {
    stubGeolocationDenied();
    const fetchMock = setupFetch({ categories: CATEGORIES, products: searchResult([]) });

    renderView();

    await waitFor(() => expect(productsCallUrl(fetchMock)).toBeDefined());
    const url = productsCallUrl(fetchMock);
    expect(url.searchParams.has("lat")).toBe(false);
    expect(url.searchParams.has("lng")).toBe(false);
    expect(url.searchParams.has("rayon")).toBe(false);
    expect(url.searchParams.get("tri")).toBe("recent");

    expect(await screen.findByText(/Active ta position/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plus proche" })).toBeDisabled();
  });

  it("sends tri=prix_asc when 'Prix croissant' is selected, even without a position", async () => {
    stubGeolocationDenied();
    const fetchMock = setupFetch({ categories: CATEGORIES, products: searchResult([]) });
    const user = userEvent.setup();

    renderView();
    await waitFor(() => expect(productsCallUrl(fetchMock)).toBeDefined());

    fetchMock.mockClear();
    await user.click(screen.getByRole("button", { name: "Prix croissant" }));

    await waitFor(() => expect(productsCallUrl(fetchMock)).toBeDefined());
    expect(productsCallUrl(fetchMock).searchParams.get("tri")).toBe("prix_asc");
  });

  it("includes the categorie slug once a category chip is selected", async () => {
    window.sessionStorage.setItem("makinum.position", JSON.stringify({ lat: 9.6, lng: -13.6 }));
    const fetchMock = setupFetch({ categories: CATEGORIES, products: searchResult([]) });
    const user = userEvent.setup();

    renderView();
    const chip = await screen.findByRole("button", { name: "Électronique" });

    fetchMock.mockClear();
    await user.click(chip);

    await waitFor(() => expect(productsCallUrl(fetchMock)).toBeDefined());
    expect(productsCallUrl(fetchMock).searchParams.get("categorie")).toBe("electronique");
  });

  it("passes the q search param from the URL through to GET /products", async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("q=pagne"));
    const fetchMock = setupFetch({ categories: [], products: searchResult([]) });

    renderView();

    await waitFor(() => expect(productsCallUrl(fetchMock)).toBeDefined());
    expect(productsCallUrl(fetchMock).searchParams.get("q")).toBe("pagne");
  });

  it("renders a product card with a GNF-formatted price and the distance badge", async () => {
    window.sessionStorage.setItem("makinum.position", JSON.stringify({ lat: 9.6, lng: -13.6 }));
    setupFetch({ categories: [], products: searchResult([makeItem()]) });

    renderView();

    const title = await screen.findByText("Pagne wax 6 yards");
    const card = title.closest("a");
    expect(card).not.toBeNull();
    expect(card).toHaveTextContent(normalizeSpaces(formatPrixGNF("185000")));
    expect(card).toHaveTextContent("0.8 km");
    expect(card).toHaveTextContent("★ 4.6 (23)");
  });

  it("acquires the position automatically on mount when idle (no stored position)", async () => {
    stubGeolocationSuccess(9.6412, -13.5784);
    const fetchMock = setupFetch({ categories: [], products: searchResult([]) });

    renderView();

    await waitFor(() => {
      const url = productsCallUrl(fetchMock);
      expect(url.searchParams.get("lat")).toBe("9.6412");
    });
  });
});
