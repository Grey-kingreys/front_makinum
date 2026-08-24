import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InstallPrompt } from "./InstallPrompt";

const STORAGE_KEY = "makinum.installPromptDismissed";

function stubMatchMedia(standalone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: standalone && query === "(display-mode: standalone)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function fireBeforeInstallPrompt(overrides: { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> } = {}) {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = overrides.prompt ?? vi.fn().mockResolvedValue(undefined);
  event.userChoice = overrides.userChoice ?? Promise.resolve({ outcome: "accepted" });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe("InstallPrompt (T67②)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    stubMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing before beforeinstallprompt fires", () => {
    render(<InstallPrompt />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders the Android variant once beforeinstallprompt fires, and calls prompt() on click", async () => {
    render(<InstallPrompt />);

    const prompt = vi.fn().mockResolvedValue(undefined);
    fireBeforeInstallPrompt({ prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });

    const installButton = await screen.findByRole("button", { name: "Installer Makinum" });
    expect(installButton).toBeInTheDocument();

    await userEvent.click(installButton);

    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it("preventDefault()s the native beforeinstallprompt mini-infobar", () => {
    render(<InstallPrompt />);
    const event = fireBeforeInstallPrompt();
    expect(event.defaultPrevented).toBe(true);
  });

  it("persists the dismissal to localStorage on close, and never renders again", async () => {
    const { unmount } = render(<InstallPrompt />);
    fireBeforeInstallPrompt();

    const closeButton = await screen.findByRole("button", { name: "Fermer l'invite d'installation" });
    await userEvent.click(closeButton);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("1");

    // Remonter le composant (ex. navigation vers une autre page qui le
    // monte aussi) : le refus déjà enregistré doit empêcher tout nouvel
    // affichage, y compris si beforeinstallprompt refire.
    unmount();
    render(<InstallPrompt />);
    fireBeforeInstallPrompt();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders nothing when the app already runs in standalone display mode", () => {
    stubMatchMedia(true);
    render(<InstallPrompt />);
    fireBeforeInstallPrompt();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders nothing when navigator.standalone is true (iOS installed)", () => {
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });

    render(<InstallPrompt />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    // @ts-expect-error -- nettoyage du mock.
    delete window.navigator.standalone;
  });

  it("renders the iOS variant (share-sheet instructions) on an iOS UA, without beforeinstallprompt", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );

    render(<InstallPrompt />);

    expect(
      screen.getByText(/Installe Makinum.*bouton Partager/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Installer Makinum" })).not.toBeInTheDocument();
  });
});
