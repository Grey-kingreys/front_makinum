import { describe, expect, it } from "vitest";

import { truncateDescription } from "./text";

describe("truncateDescription", () => {
  it("returns the text unchanged when it is already short enough", () => {
    expect(truncateDescription("Tissu wax authentique, 6 yards.")).toBe(
      "Tissu wax authentique, 6 yards.",
    );
  });

  it("collapses internal whitespace even when no truncation is needed", () => {
    expect(truncateDescription("Tissu   wax\n\nauthentique")).toBe("Tissu wax authentique");
  });

  it("truncates long text to ~160 characters without cutting a word in half", () => {
    const long =
      "Ce pagne wax est importé directement de Hollande, tissé avec des motifs traditionnels " +
      "guinéens, disponible en plusieurs coloris et livré partout à Conakry sous 48 heures ouvrées.";

    const result = truncateDescription(long);

    expect(result.length).toBeLessThanOrEqual(161); // 160 + le caractère « … »
    expect(result.endsWith("…")).toBe(true);
    // Aucun mot du texte original ne doit être coupé : chaque mot du résultat
    // (hors l'ellipse finale) doit être un mot entier du texte source.
    const words = long.split(" ");
    const resultWords = result.replace(/…$/, "").trim().split(" ");
    for (const word of resultWords) {
      expect(words).toContain(word);
    }
  });

  it("respects a custom maxLength", () => {
    const result = truncateDescription("Un mot deux mots trois mots quatre mots", 10);
    expect(result).toBe("Un mot…");
  });

  it("hard-cuts a single word longer than maxLength (no space to break on)", () => {
    const long = "a".repeat(200);
    const result = truncateDescription(long, 160);
    expect(result).toBe(`${"a".repeat(160)}…`);
  });
});
