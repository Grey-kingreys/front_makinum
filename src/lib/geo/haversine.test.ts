import { describe, expect, it } from "vitest";

import { haversineDistanceKm, roundDistanceKm } from "./haversine";

describe("haversineDistanceKm", () => {
  it("returns 0 for identical points", () => {
    const point = { lat: 9.6412, lng: -13.5784 };
    expect(haversineDistanceKm(point, point)).toBe(0);
  });

  it("computes a known distance (Conakry ~ Kindia, ~85 km)", () => {
    const conakry = { lat: 9.6412, lng: -13.5784 };
    const kindia = { lat: 10.0569, lng: -12.8658 };
    const distance = haversineDistanceKm(conakry, kindia);
    expect(distance).toBeGreaterThan(80);
    expect(distance).toBeLessThan(95);
  });

  it("is symmetric", () => {
    const a = { lat: 9.6, lng: -13.6 };
    const b = { lat: 9.7, lng: -13.5 };
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 10);
  });
});

describe("roundDistanceKm", () => {
  it("rounds to one decimal place", () => {
    expect(roundDistanceKm(0.84)).toBe(0.8);
    expect(roundDistanceKm(0.86)).toBe(0.9);
    expect(roundDistanceKm(12)).toBe(12);
  });
});
