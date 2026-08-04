import { describe, expect, it } from "vitest";

import { formatPrixGNF, initialsFromName } from "./format";

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
