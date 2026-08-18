import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import { config } from "./proxy";

/**
 * T61a — le matcher de src/proxy.ts est une regex opaque : on prouve ici,
 * avec l'utilitaire officiel de test fourni par Next.js 16
 * (`next/experimental/testing/server`, exporté sous le nom
 * `unstable_doesMiddlewareMatch` dans cette version malgré le renommage
 * middleware → proxy — vérifié dans
 * node_modules/next/dist/experimental/testing/server/middleware-testing-utils.js),
 * que les chemins internes ne déclenchent jamais le proxy, et que les pages
 * publiques le déclenchent bien.
 */
describe("proxy matcher", () => {
  it("matches ordinary page routes", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "https://makinum.kingreys.fr/produits/x?y=1",
      })
    ).toBe(true);
  });

  it("matches the site root", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "https://makinum.kingreys.fr/",
      })
    ).toBe(true);
  });

  it("never matches /_next/static/*", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "https://makinum.kingreys.fr/_next/static/chunks/main.js",
      })
    ).toBe(false);
  });

  it("never matches /_next/image", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "https://makinum.kingreys.fr/_next/image?url=%2Ficon.png&w=64&q=75",
      })
    ).toBe(false);
  });

  it("never matches /_next/data/*", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "https://makinum.kingreys.fr/_next/data/build-id/produits.json",
      })
    ).toBe(false);
  });

  it("never matches favicon.ico", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "https://makinum.kingreys.fr/favicon.ico",
      })
    ).toBe(false);
  });

  it("never matches static assets under /icons", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "https://makinum.kingreys.fr/icons/icon-512.png",
      })
    ).toBe(false);
  });
});
