import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { VendorListItem, VendorSearchResult } from "@/lib/vendors/types";

import { VendeursView } from "./VendeursView";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function makeVendor(overrides: Partial<VendorListItem> = {}): VendorListItem {
  return {
    id: "v1",
    nom: "Fatoumata Bangoura",
    statutVendeur: "VERIFIE",
    noteMoyenne: 4.6,
    nbAvis: 23,
    nbProduitsActifs: 5,
    ...overrides,
  };
}

function searchResult(items: VendorListItem[], total?: number): VendorSearchResult {
  return { items, total: total ?? items.length, page: 1, limit: 20 };
}

function setupFetch(result: VendorSearchResult, init: { ok?: boolean; status?: number } = {}): FetchMock {
  const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(result, init)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("VendeursView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the vendor list with name, badge, rating and active product count, linking to the profile", async () => {
    setupFetch(searchResult([makeVendor()]));
    render(<VendeursView />);

    const link = await screen.findByRole("link", { name: /Fatoumata Bangoura/ });
    expect(link).toHaveAttribute("href", "/vendeurs/v1");
    expect(link).toHaveTextContent("vérifié");
    expect(link).toHaveTextContent("★ 4.6 (23)");
    expect(link).toHaveTextContent("5 produits actifs");
  });

  it("shows an empty state when there are no vendors", async () => {
    setupFetch(searchResult([]));
    render(<VendeursView />);

    expect(await screen.findByText("Aucun vendeur pour l'instant.")).toBeInTheDocument();
  });

  it("shows an error state with a retry button when the fetch fails", async () => {
    setupFetch({ items: [], total: 0, page: 1, limit: 20 }, { ok: false, status: 500 });
    render(<VendeursView />);

    expect(await screen.findByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });

  it("loads the next page with 'Voir plus' and appends results", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          items: [makeVendor({ id: "v1", nom: "Fatoumata Bangoura" })],
          total: 2,
          page: 1,
          limit: 1,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [makeVendor({ id: "v2", nom: "Ibrahima Camara" })],
          total: 2,
          page: 2,
          limit: 1,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<VendeursView />);
    await screen.findByText("Fatoumata Bangoura");

    await user.click(screen.getByRole("button", { name: "Voir plus" }));

    expect(await screen.findByText("Ibrahima Camara")).toBeInTheDocument();
    expect(screen.getByText("Fatoumata Bangoura")).toBeInTheDocument();
  });
});
