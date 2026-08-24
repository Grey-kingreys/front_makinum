import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SearchField } from "./SearchField";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

/**
 * Composant réutilisé par la sidebar (variant "sidebar", défaut) et par la
 * page /produits (variant "page", T64②) — même debounce/navigation, une
 * seule implémentation. Couvre ici la mécanique partagée ; les deux points
 * d'intégration (Sidebar, ProduitsView) ont leurs propres tests de rendu.
 *
 * Timers réels (pas `vi.useFakeTimers`) : combinés à `userEvent`/React 19,
 * les fake timers font pendre le scheduler React (MessageChannel) — le
 * délai de debounce (400 ms) est court, `waitFor` avec une marge suffit.
 */
describe("SearchField", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("starts empty by default (sidebar behavior unchanged)", () => {
    render(<SearchField />);
    expect(screen.getByPlaceholderText("Chercher un produit")).toHaveValue("");
  });

  it("reflects the initialValue prop on mount", () => {
    render(<SearchField initialValue="riz" />);
    expect(screen.getByPlaceholderText("Chercher un produit")).toHaveValue("riz");
  });

  it("navigates to /produits?q=<value> after the debounce, not immediately", async () => {
    const user = userEvent.setup();
    render(<SearchField />);

    await user.type(screen.getByPlaceholderText("Chercher un produit"), "pagne");

    expect(pushMock).not.toHaveBeenCalled();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/produits?q=pagne"), {
      timeout: 3000,
    });
  });

  it("navigates to /produits (no q) once the field is cleared", async () => {
    const user = userEvent.setup();
    render(<SearchField initialValue="pagne" />);

    await user.clear(screen.getByPlaceholderText("Chercher un produit"));

    await waitFor(() => expect(pushMock).toHaveBeenLastCalledWith("/produits"), { timeout: 3000 });
  });

  it("uses the light 'page' variant styling, distinct from the default sidebar theme", () => {
    const { container: pageContainer } = render(<SearchField variant="page" />);
    const { container: sidebarContainer } = render(<SearchField />);

    expect((pageContainer.firstElementChild as HTMLElement).className).toContain("bg-white");
    expect((sidebarContainer.firstElementChild as HTMLElement).className).not.toContain("bg-white");
  });
});
