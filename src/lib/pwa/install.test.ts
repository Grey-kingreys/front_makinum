import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useInstallPrompt } from "./install";

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

function fireBeforeInstallPrompt(
  overrides: { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> } = {},
) {
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

/**
 * `beforeinstallprompt` est capté au niveau module (T70①) : l'état (évènement
 * en attente ou non) survit donc d'un test à l'autre dans ce fichier. On
 * ramène systématiquement à « rien en attente » en fin de test via
 * `appinstalled`, exactement le mécanisme public qui remet `canPrompt` à
 * faux en production — pas de hook de test dédié nécessaire.
 */
function resetDeferredEvent() {
  act(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });
}

describe("useInstallPrompt (T70①)", () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  afterEach(() => {
    resetDeferredEvent();
    vi.restoreAllMocks();
  });

  it("starts with canPrompt false when no beforeinstallprompt is pending", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canPrompt).toBe(false);
  });

  it("flips canPrompt to true once beforeinstallprompt fires", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canPrompt).toBe(false);

    fireBeforeInstallPrompt();

    await waitFor(() => expect(result.current.canPrompt).toBe(true));
  });

  it("preventDefault()s the native beforeinstallprompt mini-infobar", () => {
    renderHook(() => useInstallPrompt());
    const event = fireBeforeInstallPrompt();
    expect(event.defaultPrevented).toBe(true);
  });

  it("makes a pending event visible to a hook instance mounted after the event fired", async () => {
    // L'évènement peut arriver avant que la sidebar (ou toute autre instance
    // du hook) ne soit montée — c'est exactement le problème que la capture
    // au niveau module résout par rapport à l'ancien `useEffect` local.
    fireBeforeInstallPrompt();

    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => expect(result.current.canPrompt).toBe(true));
  });

  it("promptInstall() calls prompt(), awaits userChoice, then consumes the event (canPrompt back to false)", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const prompt = vi.fn().mockResolvedValue(undefined);
    let resolveUserChoice!: (value: { outcome: string }) => void;
    const userChoice = new Promise<{ outcome: string }>((resolve) => {
      resolveUserChoice = resolve;
    });
    fireBeforeInstallPrompt({ prompt, userChoice });
    await waitFor(() => expect(result.current.canPrompt).toBe(true));

    let installPromise!: Promise<void>;
    act(() => {
      installPromise = result.current.promptInstall();
    });

    expect(prompt).toHaveBeenCalledTimes(1);
    // Toujours en attente : userChoice ne s'est pas encore résolu.
    expect(result.current.canPrompt).toBe(true);

    await act(async () => {
      resolveUserChoice({ outcome: "accepted" });
      await installPromise;
    });

    expect(result.current.canPrompt).toBe(false);
  });

  it("promptInstall() is a no-op when no event is pending", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    await expect(result.current.promptInstall()).resolves.toBeUndefined();
    expect(result.current.canPrompt).toBe(false);
  });

  it("resets canPrompt to false on appinstalled", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    fireBeforeInstallPrompt();
    await waitFor(() => expect(result.current.canPrompt).toBe(true));

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(result.current.canPrompt).toBe(false);
  });

  it("detects standalone display mode via matchMedia", async () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => expect(result.current.isStandalone).toBe(true));
  });

  it("detects standalone via navigator.standalone (iOS installed)", async () => {
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });

    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => expect(result.current.isStandalone).toBe(true));

    // @ts-expect-error -- nettoyage du mock.
    delete window.navigator.standalone;
  });

  it("detects iOS from the user agent", async () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );

    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => expect(result.current.isIOS).toBe(true));
  });

  it("reports isIOS false on a non-iOS user agent", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => expect(result.current.isStandalone).toBe(false));
    expect(result.current.isIOS).toBe(false);
  });
});
