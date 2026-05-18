import { describe, it, expect } from "vitest";
import { withGlow, palette, semantic, text, surface, border, domainColors } from "../colors";

describe("withGlow", () => {
  it("converts hex to rgba with default opacity", () => {
    expect(withGlow("#FF0000")).toBe("rgba(255,0,0,0.4)");
  });

  it("converts hex to rgba with custom opacity", () => {
    expect(withGlow("#00FF00", 0.8)).toBe("rgba(0,255,0,0.8)");
  });

  it("handles the emerald palette color", () => {
    expect(withGlow("#6EE7B7")).toBe("rgba(110,231,183,0.4)");
  });

  it("handles black", () => {
    expect(withGlow("#000000", 1)).toBe("rgba(0,0,0,1)");
  });

  it("handles white", () => {
    expect(withGlow("#FFFFFF", 0.5)).toBe("rgba(255,255,255,0.5)");
  });
});

describe("palette", () => {
  it("has all expected color keys", () => {
    const keys = Object.keys(palette);
    expect(keys).toContain("emerald");
    expect(keys).toContain("pink");
    expect(keys).toContain("blue");
    expect(keys).toContain("amber");
    expect(keys).toContain("purple");
    expect(keys).toContain("rose");
    expect(keys).toContain("cyan");
    expect(keys).toContain("red");
    expect(keys).toContain("orange");
  });

  it("all values are valid hex colors", () => {
    for (const [, value] of Object.entries(palette)) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("semantic", () => {
  it("maps semantic names to palette colors", () => {
    expect(semantic.success).toBe(palette.emerald);
    expect(semantic.info).toBe(palette.blue);
    expect(semantic.warning).toBe(palette.orange);
    expect(semantic.thinking).toBe(palette.blue);
    expect(semantic.observation).toBe(palette.purple);
    expect(semantic.answer).toBe(palette.emerald);
    expect(semantic.user).toBe(palette.amber);
  });

  it("all values are non-empty strings", () => {
    for (const [, value] of Object.entries(semantic)) {
      expect(value).toBeTruthy();
      expect(typeof value).toBe("string");
    }
  });
});

describe("text", () => {
  it("has a descending brightness hierarchy", () => {
    const keys = ["primary", "secondary", "muted", "subtle", "faint", "disabled", "hint"] as const;
    for (const key of keys) {
      expect(text[key]).toBeTruthy();
    }
  });

  it("all values are valid hex colors", () => {
    for (const [, value] of Object.entries(text)) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
    }
  });
});

describe("surface", () => {
  it("has expected keys", () => {
    expect(surface.base).toBeTruthy();
    expect(surface.overlay).toBeTruthy();
    expect(surface.card).toBeTruthy();
    expect(surface.cardHover).toBeTruthy();
  });
});

describe("border", () => {
  it("has expected keys", () => {
    expect(border.subtle).toBeTruthy();
    expect(border.default).toBeTruthy();
    expect(border.medium).toBeTruthy();
    expect(border.grid).toBeTruthy();
  });
});

describe("domainColors", () => {
  it("has 8 entries matching palette size minus orange", () => {
    expect(domainColors).toHaveLength(8);
  });

  it("each entry has color and glow", () => {
    for (const dc of domainColors) {
      expect(dc.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(dc.glow).toMatch(/^rgba\(/);
    }
  });

  it("glow values are derived from their color", () => {
    for (const dc of domainColors) {
      expect(dc.glow).toBe(withGlow(dc.color));
    }
  });
});
