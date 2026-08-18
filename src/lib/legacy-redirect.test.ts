import { describe, expect, it } from "vitest";

import { resolveLegacyRedirectTarget } from "./legacy-redirect";

const SITE_URL = "https://makinum.com";
const LEGACY_HOSTS = "makinum.kingreys.fr";

describe("resolveLegacyRedirectTarget", () => {
  it("redirects a matched legacy host, preserving path and query", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: "makinum.kingreys.fr",
        pathWithQuery: "/produits/x?y=1",
        legacyHostsEnv: LEGACY_HOSTS,
        siteUrlEnv: SITE_URL,
      })
    ).toBe("https://makinum.com/produits/x?y=1");
  });

  it("matches regardless of case in both the request host and the env list", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: "MAKINUM.KINGREYS.FR",
        pathWithQuery: "/",
        legacyHostsEnv: "Makinum.Kingreys.Fr",
        siteUrlEnv: SITE_URL,
      })
    ).toBe("https://makinum.com/");
  });

  it("matches a request host that carries a port, ignoring the port", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: "makinum.kingreys.fr:3101",
        pathWithQuery: "/vendeurs",
        legacyHostsEnv: LEGACY_HOSTS,
        siteUrlEnv: SITE_URL,
      })
    ).toBe("https://makinum.com/vendeurs");
  });

  it("supports a comma-separated list of legacy hosts", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: "old2.example.com",
        pathWithQuery: "/",
        legacyHostsEnv: "makinum.kingreys.fr, old2.example.com ,old3.example.com",
        siteUrlEnv: SITE_URL,
      })
    ).toBe("https://makinum.com/");
  });

  it("strips a trailing slash from NEXT_PUBLIC_SITE_URL before appending the path", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: "makinum.kingreys.fr",
        pathWithQuery: "/produits",
        legacyHostsEnv: LEGACY_HOSTS,
        siteUrlEnv: "https://makinum.com/",
      })
    ).toBe("https://makinum.com/produits");
  });

  it("returns null when the request host is not in the legacy list", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: "makinum.com",
        pathWithQuery: "/produits",
        legacyHostsEnv: LEGACY_HOSTS,
        siteUrlEnv: SITE_URL,
      })
    ).toBeNull();
  });

  it("returns null when LEGACY_REDIRECT_HOSTS is undefined", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: "makinum.kingreys.fr",
        pathWithQuery: "/produits",
        legacyHostsEnv: undefined,
        siteUrlEnv: SITE_URL,
      })
    ).toBeNull();
  });

  it("returns null when LEGACY_REDIRECT_HOSTS is an empty string", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: "makinum.kingreys.fr",
        pathWithQuery: "/produits",
        legacyHostsEnv: "",
        siteUrlEnv: SITE_URL,
      })
    ).toBeNull();
  });

  it("returns null when LEGACY_REDIRECT_HOSTS only contains blank entries", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: "makinum.kingreys.fr",
        pathWithQuery: "/produits",
        legacyHostsEnv: " , ,",
        siteUrlEnv: SITE_URL,
      })
    ).toBeNull();
  });

  it("returns null when NEXT_PUBLIC_SITE_URL is undefined, even with a matched host", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: "makinum.kingreys.fr",
        pathWithQuery: "/produits",
        legacyHostsEnv: LEGACY_HOSTS,
        siteUrlEnv: undefined,
      })
    ).toBeNull();
  });

  it("returns null when the request has no Host header", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: null,
        pathWithQuery: "/produits",
        legacyHostsEnv: LEGACY_HOSTS,
        siteUrlEnv: SITE_URL,
      })
    ).toBeNull();
  });

  it("preserves internal paths like /_next/* in the target URL when the host matches (the matcher, not this function, is responsible for excluding them)", () => {
    expect(
      resolveLegacyRedirectTarget({
        requestHost: "makinum.kingreys.fr",
        pathWithQuery: "/_next/static/chunks/main.js",
        legacyHostsEnv: LEGACY_HOSTS,
        siteUrlEnv: SITE_URL,
      })
    ).toBe("https://makinum.com/_next/static/chunks/main.js");
  });
});
