import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { escapeJsonLdForScript, JsonLd } from "./json-ld";

describe("escapeJsonLdForScript", () => {
  it("serializes plain data as JSON", () => {
    expect(escapeJsonLdForScript({ a: 1, b: "x" })).toBe('{"a":1,"b":"x"}');
  });

  it("escapes </script> so it cannot break out of the script tag", () => {
    const data = { name: 'Pagne </script><script>alert(1)</script>' };
    const serialized = escapeJsonLdForScript(data);

    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<script>");
    // Le JSON reste sémantiquement identique une fois désérialisé.
    expect(JSON.parse(serialized.replace(/\\u003c/g, "<").replace(/\\u003e/g, ">"))).toEqual(data);
  });

  it("escapes bare & to avoid HTML entity confusion", () => {
    expect(escapeJsonLdForScript({ a: "Tom & Jerry" })).toContain("\\u0026");
  });
});

describe("JsonLd", () => {
  it("renders a script tag of type application/ld+json with the escaped payload", () => {
    const { container } = render(<JsonLd data={{ "@type": "Product", name: "Pagne wax" }} />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).not.toBeNull();
    expect(JSON.parse(script?.textContent ?? "")).toEqual({ "@type": "Product", name: "Pagne wax" });
  });

  it("neutralizes a malicious title containing </script> when rendered", () => {
    const { container } = render(<JsonLd data={{ name: "</script><img src=x onerror=alert(1)>" }} />);
    const script = container.querySelector("script");

    expect(script).not.toBeNull();
    expect(script?.innerHTML).not.toContain("</script>");
    expect(JSON.parse(script?.textContent ?? "")).toEqual({
      name: "</script><img src=x onerror=alert(1)>",
    });
  });
});
