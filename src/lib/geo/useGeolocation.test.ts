import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useGeolocation } from "./useGeolocation";

function stubGeolocation(
  impl: (
    success: PositionCallback,
    error?: PositionErrorCallback,
  ) => void,
): void {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: impl },
  });
}

describe("useGeolocation", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
  });

  it("starts idle with no position when sessionStorage is empty", () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe("idle");
    expect(result.current.position).toBeNull();
  });

  it("starts granted when a position is already stored in sessionStorage", () => {
    window.sessionStorage.setItem("makinum.position", JSON.stringify({ lat: 1.5, lng: 2.5 }));

    const { result } = renderHook(() => useGeolocation());

    expect(result.current.status).toBe("granted");
    expect(result.current.position).toEqual({ lat: 1.5, lng: 2.5 });
  });

  it("transitions idle -> granted and stores the position on request() success", async () => {
    stubGeolocation((success) => {
      success({ coords: { latitude: 9.6412, longitude: -13.5784 } } as GeolocationPosition);
    });

    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe("idle");

    act(() => result.current.request());

    await waitFor(() => expect(result.current.status).toBe("granted"));
    expect(result.current.position).toEqual({ lat: 9.6412, lng: -13.5784 });
    expect(JSON.parse(window.sessionStorage.getItem("makinum.position")!)).toEqual({
      lat: 9.6412,
      lng: -13.5784,
    });
  });

  it("transitions idle -> denied when the browser refuses the permission", async () => {
    stubGeolocation((_success, error) => {
      error?.({ code: 1, message: "User denied Geolocation" } as GeolocationPositionError);
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.request());

    await waitFor(() => expect(result.current.status).toBe("denied"));
    expect(result.current.position).toBeNull();
  });

  it("goes straight to denied when navigator.geolocation is unavailable", () => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());

    expect(result.current.status).toBe("denied");
  });
});
