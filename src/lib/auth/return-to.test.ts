import { describe, expect, it } from "vitest";

import {
  buildInscriptionHref,
  buildLoginHref,
  isSafeReturnPath,
  resolveReturnTo,
} from "./return-to";

describe("isSafeReturnPath", () => {
  it("accepts an internal path starting with a single /", () => {
    expect(isSafeReturnPath("/produits/p1")).toBe(true);
    expect(isSafeReturnPath("/vendeurs/v1")).toBe(true);
  });

  it("rejects a missing or empty path", () => {
    expect(isSafeReturnPath(null)).toBe(false);
    expect(isSafeReturnPath(undefined)).toBe(false);
    expect(isSafeReturnPath("")).toBe(false);
  });

  it("rejects a path not starting with /", () => {
    expect(isSafeReturnPath("dashboard")).toBe(false);
  });

  it("rejects a protocol-relative URL (//host)", () => {
    expect(isSafeReturnPath("//evil.tld")).toBe(false);
  });

  it("rejects an absolute URL with an explicit scheme (://)", () => {
    expect(isSafeReturnPath("https://evil.tld")).toBe(false);
    expect(isSafeReturnPath("javascript:alert(1)")).toBe(false);
  });

  // Le navigateur normalise `\` en `/` dans la partie chemin d'une URL
  // http/https (WHATWG URL) : `/\evil.tld` et `/\/evil.tld` se résolvent en
  // `https://evil.tld/` — un antislash suffit à contourner les contrôles
  // précédents (commence par `/`, pas `//`, pas `://`) sans lui.
  it("rejects a path containing a backslash (browser \\ → / normalization bypass)", () => {
    expect(isSafeReturnPath("/\\evil.tld")).toBe(false);
    expect(isSafeReturnPath("/\\/evil.tld")).toBe(false);
  });
});

describe("resolveReturnTo", () => {
  function paramsOf(returnTo: string | null): { get(name: string): string | null } {
    return { get: () => returnTo };
  }

  it("returns the returnTo value when it is a safe internal path", () => {
    expect(resolveReturnTo(paramsOf("/produits/p1"))).toBe("/produits/p1");
  });

  it.each([
    [null],
    ["https://evil.tld"],
    ["//evil.tld"],
    ["javascript:alert(1)"],
    ["/\\evil.tld"],
    ["/\\/evil.tld"],
  ])("falls back to /dashboard for %s", (returnTo) => {
    expect(resolveReturnTo(paramsOf(returnTo))).toBe("/dashboard");
  });
});

describe("buildLoginHref", () => {
  it("appends an encoded ?returnTo= when the path is safe", () => {
    expect(buildLoginHref("/produits/p1")).toBe("/connexion?returnTo=%2Fproduits%2Fp1");
  });

  it.each([[undefined], [null], ["https://evil.tld"], ["//evil.tld"], ["/\\evil.tld"], ["/\\/evil.tld"]])(
    "falls back to a bare /connexion for %s",
    (returnTo) => {
      expect(buildLoginHref(returnTo)).toBe("/connexion");
    },
  );
});

describe("buildInscriptionHref", () => {
  it("appends an encoded ?returnTo= when the path is safe", () => {
    expect(buildInscriptionHref("/vendeurs/v1")).toBe("/inscription?returnTo=%2Fvendeurs%2Fv1");
  });

  it.each([[undefined], [null], ["https://evil.tld"], ["//evil.tld"], ["/\\evil.tld"], ["/\\/evil.tld"]])(
    "falls back to a bare /inscription for %s",
    (returnTo) => {
      expect(buildInscriptionHref(returnTo)).toBe("/inscription");
    },
  );
});
