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

const { useSearchParamsMock, pushMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: useSearchParamsMock,
  // ProduitsView rend désormais SearchField (T64②), qui appelle useRouter().
  useRouter: () => ({ push: pushMock }),
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

/** Stub navigator.geolocation avec un espion sur getCurrentPosition, pour
 * pouvoir affirmer QUAND (ou si) le navigateur a été sollicité (T64①). */
function stubGeolocation(
  behavior: (success: PositionCallback, error: PositionErrorCallback) => void,
): ReturnType<typeof vi.fn> {
  const getCurrentPosition = vi.fn(behavior);
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
}

function stubGeolocationSuccess(lat: number, lng: number) {
  return stubGeolocation((success) => {
    success({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition);
  });
}

function stubGeolocationDenied() {
  return stubGeolocation((_success, error) => {
    error({ code: 1, message: "denied" } as GeolocationPositionError);
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
    pushMock.mockClear();
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

  // T64① — la géoloc n'est plus jamais demandée automatiquement : au repos
  // (idle, aucune position en sessionStorage), la page reste en tri=recent
  // et affiche le bandeau d'invitation, sans qu'aucune popup navigateur
  // n'ait été sollicitée.
  it("stays on tri=recent with no lat/lng/rayon at rest (idle), and shows the invitation banner", async () => {
    const getCurrentPosition = stubGeolocationSuccess(9.6412, -13.5784);
    const fetchMock = setupFetch({ categories: CATEGORIES, products: searchResult([]) });

    renderView();

    await waitFor(() => expect(productsCallUrl(fetchMock)).toBeDefined());
    const url = productsCallUrl(fetchMock);
    expect(url.searchParams.has("lat")).toBe(false);
    expect(url.searchParams.has("lng")).toBe(false);
    expect(url.searchParams.has("rayon")).toBe(false);
    expect(url.searchParams.get("tri")).toBe("recent");

    expect(await screen.findByText(/Active ta position/i)).toBeInTheDocument();
    // Jamais de demande de permission tant que rien n'a été cliqué (T64① —
    // ce test échoue si l'ancien `if (geoStatus === "idle") request()` au
    // montage est réintroduit).
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  // La phrase d'explication (T64①) doit être visible AVANT le bouton, tant
  // qu'aucune position n'est connue — un public non technicien doit
  // comprendre pourquoi le navigateur va lui demander la permission avant
  // que la popup n'apparaisse.
  it("renders the explanation sentence before the 'Activer ma position' button", async () => {
    setupFetch({ categories: CATEGORIES, products: searchResult([]) });

    renderView();

    const explanation = await screen.findByText(
      /Ta position sert uniquement à trier par distance\. Elle n'est pas enregistrée\./i,
    );
    const button = screen.getByRole("button", { name: "Activer ma position" });
    expect(explanation).toBeInTheDocument();

    // La phrase précède le bouton dans le DOM (ordre de lecture).
    const banner = button.closest("div");
    expect(banner).not.toBeNull();
    const html = banner!.innerHTML;
    expect(html.indexOf("Ta position sert uniquement")).toBeGreaterThan(-1);
    expect(html.indexOf("Ta position sert uniquement")).toBeLessThan(html.indexOf("Activer ma position"));
  });

  it("requests geolocation only when 'Activer ma position' is clicked, not before", async () => {
    const getCurrentPosition = stubGeolocationSuccess(9.6412, -13.5784);
    const fetchMock = setupFetch({ categories: CATEGORIES, products: searchResult([]) });
    const user = userEvent.setup();

    renderView();
    const button = await screen.findByRole("button", { name: "Activer ma position" });
    expect(getCurrentPosition).not.toHaveBeenCalled();

    await user.click(button);

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(productsCallUrl(fetchMock).searchParams.get("lat")).toBe("9.6412");
    });
    // Position acquise : le bandeau d'invitation disparaît.
    expect(screen.queryByRole("button", { name: "Activer ma position" })).not.toBeInTheDocument();
  });

  it("requests geolocation when 'Plus proche' is clicked and no position is known yet, and applies tri=proche once granted", async () => {
    const getCurrentPosition = stubGeolocationSuccess(9.6412, -13.5784);
    const fetchMock = setupFetch({ categories: CATEGORIES, products: searchResult([]) });
    const user = userEvent.setup();

    renderView();
    await waitFor(() => expect(productsCallUrl(fetchMock)).toBeDefined());
    expect(getCurrentPosition).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Plus proche" }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      const url = productsCallUrl(fetchMock);
      expect(url.searchParams.get("tri")).toBe("proche");
      expect(url.searchParams.get("lat")).toBe("9.6412");
    });
  });

  it("keeps tri=recent and the banner when geolocation is denied after clicking 'Activer ma position'", async () => {
    const getCurrentPosition = stubGeolocationDenied();
    const fetchMock = setupFetch({ categories: CATEGORIES, products: searchResult([]) });
    const user = userEvent.setup();

    renderView();
    await user.click(await screen.findByRole("button", { name: "Activer ma position" }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      const url = productsCallUrl(fetchMock);
      expect(url.searchParams.has("lat")).toBe(false);
      expect(url.searchParams.get("tri")).toBe("recent");
    });
    expect(screen.getByRole("button", { name: "Activer ma position" })).toBeInTheDocument();
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
    expect(card).toHaveTextContent("4.6 (23)");
  });

  // T38b : le backend n'exclut plus les produits publiés sans coordonnées —
  // ils arrivent avec distanceKm/latitude/longitude à null, mélangés aux
  // produits localisés dans la même page de résultats.
  it("shows 'Localisation non précisée' for products without coordinates, and a real distance for the others in the same list", async () => {
    window.sessionStorage.setItem("makinum.position", JSON.stringify({ lat: 9.6, lng: -13.6 }));
    const located = makeItem({ id: "p1", titre: "Pagne wax 6 yards", distanceKm: 0.8 });
    const unlocated = makeItem({
      id: "p2",
      titre: "Sac en raphia",
      latitude: null,
      longitude: null,
      distanceKm: null,
    });
    setupFetch({ categories: [], products: searchResult([located, unlocated]) });

    renderView();

    const locatedTitle = await screen.findByText("Pagne wax 6 yards");
    const locatedCard = locatedTitle.closest("a");
    expect(locatedCard).toHaveTextContent("0.8 km");
    expect(locatedCard).not.toHaveTextContent("Localisation non précisée");

    const unlocatedTitle = await screen.findByText("Sac en raphia");
    const unlocatedCard = unlocatedTitle.closest("a");
    expect(unlocatedCard).toHaveTextContent("Localisation non précisée");
    // Jamais de valeur trompeuse à la place de la distance manquante.
    expect(unlocatedCard).not.toHaveTextContent("0 km");
    expect(unlocatedCard).not.toHaveTextContent("null km");
  });

  it("keeps the header truthful now that results can include products outside the radius (unlocated ones)", async () => {
    window.sessionStorage.setItem("makinum.position", JSON.stringify({ lat: 9.6, lng: -13.6 }));
    setupFetch({
      categories: [],
      products: searchResult(
        [makeItem({ id: "p1" }), makeItem({ id: "p2", latitude: null, longitude: null, distanceKm: null })],
        2,
      ),
    });

    renderView();

    const subtitle = await screen.findByText(/produits actifs/);
    expect(subtitle).toHaveTextContent("dans un rayon de 25 km ou sans localisation précisée");
    // Ne doit plus affirmer que tous les résultats sont dans le rayon.
    expect(subtitle.textContent).not.toMatch(/^2 produits actifs dans un rayon de 25 km ·/);
  });

  // T64② — recherche visible en tête de page (plus seulement dans le drawer
  // sidebar) : même mécanique de debounce/navigation que SearchField.
  describe("search field (T64②)", () => {
    it("renders the search field with the expected placeholder", async () => {
      setupFetch({ categories: [], products: searchResult([]) });

      renderView();

      expect(await screen.findByPlaceholderText("Chercher un produit")).toBeInTheDocument();
    });

    it("reflects the current ?q= value on arrival", async () => {
      useSearchParamsMock.mockReturnValue(new URLSearchParams("q=pagne"));
      setupFetch({ categories: [], products: searchResult([]) });

      renderView();

      expect(await screen.findByPlaceholderText("Chercher un produit")).toHaveValue("pagne");
    });

    // Timers réels : `vi.useFakeTimers()` fait pendre le scheduler React
    // (MessageChannel) combiné à `userEvent` — voir SearchField.test.tsx.
    it("navigates to /produits?q=<value> after the debounce", async () => {
      setupFetch({ categories: [], products: searchResult([]) });
      const user = userEvent.setup();

      renderView();
      const input = screen.getByPlaceholderText("Chercher un produit");

      await user.type(input, "riz");
      expect(pushMock).not.toHaveBeenCalled();

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/produits?q=riz"), {
        timeout: 3000,
      });
    });
  });

  // T64③ — une tuile catégorie de la landing pointe vers
  // /produits?categorie=<slug> ; ProduitsView doit lire ce param à l'arrivée
  // pour pré-sélectionner le chip correspondant (et filtrer), avec repli sur
  // « Tous » pour un slug absent ou inconnu.
  describe("?categorie= param on arrival (T64③)", () => {
    it("preselects the matching chip and filters by it for a known slug", async () => {
      useSearchParamsMock.mockReturnValue(new URLSearchParams("categorie=electronique"));
      const fetchMock = setupFetch({ categories: CATEGORIES, products: searchResult([]) });

      renderView();

      const chip = await screen.findByRole("button", { name: "Électronique" });
      await waitFor(() => expect(chip).toHaveClass("border-brand", "bg-brand", "text-cream"));

      const tousChip = screen.getByRole("button", { name: "Tous" });
      expect(tousChip).not.toHaveClass("bg-brand");

      await waitFor(() => {
        expect(productsCallUrl(fetchMock).searchParams.get("categorie")).toBe("electronique");
      });
    });

    it("falls back to 'Tous' for an unknown slug", async () => {
      useSearchParamsMock.mockReturnValue(new URLSearchParams("categorie=inexistant"));
      const fetchMock = setupFetch({ categories: CATEGORIES, products: searchResult([]) });

      renderView();

      await screen.findByRole("button", { name: "Électronique" });
      const tousChip = screen.getByRole("button", { name: "Tous" });
      await waitFor(() => expect(tousChip).toHaveClass("border-brand", "bg-brand", "text-cream"));

      await waitFor(() => {
        expect(productsCallUrl(fetchMock).searchParams.has("categorie")).toBe(false);
      });
    });

    it("falls back to 'Tous' when the param is absent", async () => {
      const fetchMock = setupFetch({ categories: CATEGORIES, products: searchResult([]) });

      renderView();

      const tousChip = await screen.findByRole("button", { name: "Tous" });
      expect(tousChip).toHaveClass("border-brand", "bg-brand", "text-cream");
      await waitFor(() => {
        expect(productsCallUrl(fetchMock).searchParams.has("categorie")).toBe(false);
      });
    });
  });
});
