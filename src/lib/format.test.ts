import { describe, expect, it } from "vitest";

import { formatDate, formatPrixGNF, initialsFromName } from "./format";

describe("formatPrixGNF", () => {
  it("formats a plain integer string with fr-FR grouping and the GNF suffix", () => {
    expect(formatPrixGNF("185000")).toBe("185 000 GNF");
  });

  it("formats a small amount without grouping separators", () => {
    expect(formatPrixGNF("500")).toBe("500 GNF");
  });

  it("falls back to raw value + GNF when the string is not numeric", () => {
    expect(formatPrixGNF("abc")).toBe("abc GNF");
  });
});

describe("initialsFromName", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsFromName("Fatoumata Bangoura")).toBe("FB");
  });

  it("uses the first two letters of a single-word name", () => {
    expect(initialsFromName("Makinum")).toBe("MA");
  });

  it("returns a placeholder for an empty name", () => {
    expect(initialsFromName("   ")).toBe("?");
  });
});

describe("formatDate", () => {
  it("formats an ISO date in long fr-FR form", () => {
    expect(formatDate("2026-08-04T10:00:00.000Z")).toBe("4 août 2026");
  });

  it("falls back to the raw value when the date is invalid", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});
