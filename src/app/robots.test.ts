import { afterEach, beforeEach, describe, expect, it } from "vitest";

import robots from "./robots";

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

describe("robots", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://makinum.kingreys.fr";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  });

  it("allows the public catalog paths", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules.allow).toEqual(["/", "/produits", "/vendeurs", "/cgu", "/confidentialite"]);
  });

  it("disallows every path that requires a session", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules.disallow).toEqual([
      "/dashboard",
      "/demandes",
      "/notifications",
      "/vendeur/",
      "/admin/",
      "/devenir-vendeur",
      "/connexion",
      "/inscription",
      "/recuperation",
      "/verification",
    ]);
  });

  it("applies to every user agent", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules.userAgent).toBe("*");
  });

  it("points to the absolute sitemap URL built from NEXT_PUBLIC_SITE_URL", () => {
    expect(robots().sitemap).toBe("https://makinum.kingreys.fr/sitemap.xml");
  });
});
