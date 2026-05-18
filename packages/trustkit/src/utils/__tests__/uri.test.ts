import { describe, it, expect } from "vitest";
import { getLocalName } from "../uri";

describe("getLocalName", () => {
  it("extracts fragment after #", () => {
    expect(getLocalName("http://example.org/onto#Person")).toBe("Person");
  });

  it("extracts last path segment after /", () => {
    expect(getLocalName("http://example.org/onto/Person")).toBe("Person");
  });

  it("prefers # over / when both present", () => {
    expect(getLocalName("http://example.org/onto#Person")).toBe("Person");
  });

  it("handles # at end of URI with local name", () => {
    expect(getLocalName("http://example.org/ns#")).toBe("");
  });

  it("handles URI with no fragment or path", () => {
    expect(getLocalName("urn:example")).toBe("urn:example");
  });

  it("handles empty string", () => {
    expect(getLocalName("")).toBe("");
  });

  it("handles multiple # characters", () => {
    expect(getLocalName("http://example.org/ns#sub#Thing")).toBe("Thing");
  });

  it("handles trailing slash", () => {
    expect(getLocalName("http://example.org/onto/")).toBe("");
  });

  it("handles deep path", () => {
    expect(getLocalName("http://example.org/a/b/c/d/Entity")).toBe("Entity");
  });
});
