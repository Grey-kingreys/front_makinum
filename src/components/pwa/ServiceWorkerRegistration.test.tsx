import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceWorkerRegistration } from "./ServiceWorkerRegistration";

describe("ServiceWorkerRegistration (T67①)", () => {
  let register: ReturnType<typeof vi.fn>;
  let getRegistrations: ReturnType<typeof vi.fn>;
  let unregister: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    unregister = vi.fn();
    register = vi.fn().mockResolvedValue(undefined);
    getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register, getRegistrations },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // @ts-expect-error -- nettoyage du mock posé dans beforeEach.
    delete navigator.serviceWorker;
  });

  it("does not register the service worker outside production, and unregisters a leftover one", async () => {
    vi.stubEnv("NODE_ENV", "development");

    render(<ServiceWorkerRegistration />);
    await Promise.resolve();
    await Promise.resolve();

    expect(register).not.toHaveBeenCalled();
    expect(getRegistrations).toHaveBeenCalledTimes(1);
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it("registers /sw.js in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    render(<ServiceWorkerRegistration />);
    await Promise.resolve();

    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(getRegistrations).not.toHaveBeenCalled();
  });

  it("does nothing when the browser has no serviceWorker support", () => {
    // @ts-expect-error -- simule un navigateur sans support.
    delete navigator.serviceWorker;
    vi.stubEnv("NODE_ENV", "production");

    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
  });

  it("renders nothing", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { container } = render(<ServiceWorkerRegistration />);
    expect(container).toBeEmptyDOMElement();
  });
});
