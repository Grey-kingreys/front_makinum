import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CategoryListItem } from "@/lib/categories/types";

import { CategoryGrid } from "./CategoryGrid";

const { listCategoriesCachedMock } = vi.hoisted(() => ({
  listCategoriesCachedMock: vi.fn(),
}));

vi.mock("@/lib/categories/api", () => ({
  listCategoriesCached: listCategoriesCachedMock,
}));

const STATIC_FALLBACK_NAMES = [
  "Alimentation",
  "Mode & tissus",
  "Électronique",
  "Maison",
  "Matériaux",
  "Services",
];

// CategoryGrid est un composant serveur async : React Testing Library ne
// sait pas l'attendre tout seul (pas de pipeline RSC en test), on résout
// donc la promesse nous-mêmes avant de passer l'élément à `render`.
async function renderGrid() {
  render(await CategoryGrid());
}

describe("CategoryGrid", () => {
  beforeEach(() => {
    listCategoriesCachedMock.mockReset();
  });

  it("renders the categories returned by GET /categories", async () => {
    const categories: CategoryListItem[] = [
      { id: "c1", nom: "Bricolage", slug: "bricolage", parentId: null },
      { id: "c2", nom: "Beauté", slug: "beaute", parentId: null },
    ];
    listCategoriesCachedMock.mockResolvedValueOnce(categories);

    await renderGrid();

    expect(screen.getByText("Bricolage")).toBeInTheDocument();
    expect(screen.getByText("Beauté")).toBeInTheDocument();
    expect(screen.queryByText("Alimentation")).not.toBeInTheDocument();
  });

  it("falls back to the static category list when the API call fails", async () => {
    listCategoriesCachedMock.mockRejectedValueOnce(new Error("network down"));

    await renderGrid();

    for (const nom of STATIC_FALLBACK_NAMES) {
      expect(screen.getByText(nom)).toBeInTheDocument();
    }
  });

  it("falls back to the static category list when the API returns an empty list", async () => {
    listCategoriesCachedMock.mockResolvedValueOnce([]);

    await renderGrid();

    for (const nom of STATIC_FALLBACK_NAMES) {
      expect(screen.getByText(nom)).toBeInTheDocument();
    }
  });
});
