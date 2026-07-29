import { describe, it, expect } from "vitest";
import { withGlow } from "../glow";

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
