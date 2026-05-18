import { describe, it, expect } from "vitest";
import { uriToId, predicateToName } from "../useGraphData";

describe("uriToId", () => {
  it("extracts fragment after #", () => {
    expect(uriToId("http://example.org/onto#Person")).toBe("Person");
  });

  it("extracts last path segment after /", () => {
    expect(uriToId("http://example.org/onto/Person")).toBe("Person");
  });

  it("prefers # when both present", () => {
    expect(uriToId("http://example.org/path/to#Thing")).toBe("Thing");
  });

  it("returns full string when no separator", () => {
    expect(uriToId("urn:example")).toBe("urn:example");
  });

  it("handles trailing #", () => {
    expect(uriToId("http://example.org/ns#")).toBe("");
  });

  it("handles empty string", () => {
    expect(uriToId("")).toBe("");
  });
});

describe("predicateToName", () => {
  it("extracts and formats camelCase with underscores", () => {
    expect(predicateToName("http://example.org/onto#worksFor")).toBe("works_for");
  });

  it("handles already-lowercase names", () => {
    expect(predicateToName("http://example.org/onto#name")).toBe("name");
  });

  it("handles multi-word camelCase", () => {
    expect(predicateToName("http://example.org/onto#hasFirstName")).toBe("has_first_name");
  });

  it("extracts from hash URI", () => {
    expect(predicateToName("http://www.w3.org/2000/01/rdf-schema#subClassOf")).toBe("sub_class_of");
  });

  it("extracts from slash URI", () => {
    expect(predicateToName("http://example.org/ns/myProperty")).toBe("my_property");
  });

  it("returns full string when no separator", () => {
    expect(predicateToName("simple")).toBe("simple");
  });
});
