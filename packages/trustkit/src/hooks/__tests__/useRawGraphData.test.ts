import { describe, it, expect } from "vitest";
import {
  getTermValue,
  isUri,
  hashString,
  colorForUri,
  predicateLabel,
  processTriples,
} from "../useRawGraphData";
import type { RawNode, RawEdge, PredicateInfo } from "../useRawGraphData";
import type { Triple } from "@trustgraph/react-state";
import { domainColors } from "../../theme";

// ── Helpers ──────────────────────────────────────────────────────

function iri(i: string): { t: "i"; i: string } {
  return { t: "i", i };
}

function lit(v: string): { t: "l"; v: string } {
  return { t: "l", v };
}

function triple(s: string, p: string, o: string, oType: "i" | "l" = "i"): Triple {
  return {
    s: iri(s),
    p: iri(p),
    o: oType === "i" ? iri(o) : lit(o),
  };
}

const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";

// ── Tests ────────────────────────────────────────────────────────

describe("getTermValue", () => {
  it("extracts IRI value", () => {
    expect(getTermValue({ t: "i", i: "http://example.org/x" })).toBe("http://example.org/x");
  });

  it("extracts literal value", () => {
    expect(getTermValue({ t: "l", v: "hello" })).toBe("hello");
  });

  it("returns empty for blank node", () => {
    expect(getTermValue({ t: "b" })).toBe("");
  });

  it("handles missing i field on IRI", () => {
    expect(getTermValue({ t: "i" })).toBe("");
  });

  it("handles missing v field on literal", () => {
    expect(getTermValue({ t: "l" })).toBe("");
  });
});

describe("isUri", () => {
  it("returns true for IRI terms", () => {
    expect(isUri({ t: "i" })).toBe(true);
  });

  it("returns false for literal terms", () => {
    expect(isUri({ t: "l" })).toBe(false);
  });

  it("returns false for blank nodes", () => {
    expect(isUri({ t: "b" })).toBe(false);
  });
});

describe("hashString", () => {
  it("returns a non-negative integer", () => {
    const h = hashString("test");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });

  it("is deterministic", () => {
    expect(hashString("hello")).toBe(hashString("hello"));
  });

  it("produces different values for different strings", () => {
    expect(hashString("aaa")).not.toBe(hashString("bbb"));
  });

  it("handles empty string", () => {
    expect(hashString("")).toBe(0);
  });
});

describe("colorForUri", () => {
  it("returns a color and glow from the domain palette", () => {
    const result = colorForUri("http://example.org/x");
    expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(result.glow).toMatch(/^rgba\(/);
  });

  it("is deterministic for the same URI", () => {
    const a = colorForUri("http://example.org/x");
    const b = colorForUri("http://example.org/x");
    expect(a.color).toBe(b.color);
    expect(a.glow).toBe(b.glow);
  });

  it("result is from domainColors", () => {
    const result = colorForUri("http://example.org/y");
    expect(domainColors.some((dc) => dc.color === result.color && dc.glow === result.glow)).toBe(true);
  });
});

describe("predicateLabel", () => {
  it("extracts and formats camelCase predicate", () => {
    expect(predicateLabel("http://example.org/onto#worksFor")).toBe("works for");
  });

  it("handles already-lowercase names", () => {
    expect(predicateLabel("http://example.org/onto#name")).toBe("name");
  });

  it("handles multi-word camelCase", () => {
    expect(predicateLabel("http://example.org/onto#hasFirstName")).toBe("has first name");
  });

  it("extracts from hash URI", () => {
    expect(predicateLabel("http://example.org/ns#label")).toBe("label");
  });

  it("extracts from slash URI", () => {
    expect(predicateLabel("http://example.org/ns/label")).toBe("label");
  });
});

describe("processTriples", () => {
  function freshState() {
    return {
      nodeMap: new Map<string, RawNode>(),
      edgeSet: new Set<string>(),
      edgeList: [] as RawEdge[],
      predMap: new Map<string, PredicateInfo>(),
    };
  }

  it("creates nodes for URI subjects and objects", () => {
    const state = freshState();
    const triples: Triple[] = [
      triple("http://a.org/A", "http://a.org/rel", "http://a.org/B"),
    ];
    processTriples(triples, state.nodeMap, state.edgeSet, state.edgeList, state.predMap);
    expect(state.nodeMap.has("http://a.org/A")).toBe(true);
    expect(state.nodeMap.has("http://a.org/B")).toBe(true);
  });

  it("creates edges between URI nodes", () => {
    const state = freshState();
    const triples: Triple[] = [
      triple("http://a.org/A", "http://a.org/rel", "http://a.org/B"),
    ];
    processTriples(triples, state.nodeMap, state.edgeSet, state.edgeList, state.predMap);
    expect(state.edgeList).toHaveLength(1);
    expect(state.edgeList[0].from).toBe("http://a.org/A");
    expect(state.edgeList[0].to).toBe("http://a.org/B");
  });

  it("deduplicates edges", () => {
    const state = freshState();
    const triples: Triple[] = [
      triple("http://a.org/A", "http://a.org/rel", "http://a.org/B"),
      triple("http://a.org/A", "http://a.org/rel", "http://a.org/B"),
    ];
    processTriples(triples, state.nodeMap, state.edgeSet, state.edgeList, state.predMap);
    expect(state.edgeList).toHaveLength(1);
  });

  it("collects labels from rdfs:label triples", () => {
    const state = freshState();
    const triples: Triple[] = [
      { s: iri("http://a.org/A"), p: iri(RDFS_LABEL), o: lit("Node A") },
      triple("http://a.org/A", "http://a.org/rel", "http://a.org/B"),
    ];
    processTriples(triples, state.nodeMap, state.edgeSet, state.edgeList, state.predMap);
    expect(state.nodeMap.get("http://a.org/A")?.label).toBe("Node A");
  });

  it("does not create edges for rdfs:label triples", () => {
    const state = freshState();
    const triples: Triple[] = [
      { s: iri("http://a.org/A"), p: iri(RDFS_LABEL), o: lit("Node A") },
    ];
    processTriples(triples, state.nodeMap, state.edgeSet, state.edgeList, state.predMap);
    expect(state.edgeList).toHaveLength(0);
  });

  it("stores literal values as node properties", () => {
    const state = freshState();
    const triples: Triple[] = [
      { s: iri("http://a.org/A"), p: iri("http://a.org/age"), o: lit("42") },
    ];
    processTriples(triples, state.nodeMap, state.edgeSet, state.edgeList, state.predMap);
    const node = state.nodeMap.get("http://a.org/A");
    expect(node?.properties["age"]).toEqual(["42"]);
  });

  it("deduplicates literal property values", () => {
    const state = freshState();
    const triples: Triple[] = [
      { s: iri("http://a.org/A"), p: iri("http://a.org/tag"), o: lit("foo") },
      { s: iri("http://a.org/A"), p: iri("http://a.org/tag"), o: lit("foo") },
    ];
    processTriples(triples, state.nodeMap, state.edgeSet, state.edgeList, state.predMap);
    const node = state.nodeMap.get("http://a.org/A");
    expect(node?.properties["tag"]).toEqual(["foo"]);
  });

  it("tracks predicate counts", () => {
    const state = freshState();
    const triples: Triple[] = [
      triple("http://a.org/A", "http://a.org/rel", "http://a.org/B"),
      triple("http://a.org/B", "http://a.org/rel", "http://a.org/C"),
    ];
    processTriples(triples, state.nodeMap, state.edgeSet, state.edgeList, state.predMap);
    const pred = state.predMap.get("http://a.org/rel");
    expect(pred?.count).toBe(2);
    expect(pred?.label).toBe("rel");
  });

  it("updates degree counts on nodes", () => {
    const state = freshState();
    const triples: Triple[] = [
      triple("http://a.org/A", "http://a.org/r1", "http://a.org/B"),
      triple("http://a.org/A", "http://a.org/r2", "http://a.org/C"),
    ];
    processTriples(triples, state.nodeMap, state.edgeSet, state.edgeList, state.predMap);
    expect(state.nodeMap.get("http://a.org/A")?.outDegree).toBe(2);
    expect(state.nodeMap.get("http://a.org/B")?.inDegree).toBe(1);
    expect(state.nodeMap.get("http://a.org/C")?.inDegree).toBe(1);
  });

  it("updates labels on existing nodes when label triples arrive later", () => {
    const state = freshState();
    // First batch: create node without label
    processTriples(
      [triple("http://a.org/A", "http://a.org/rel", "http://a.org/B")],
      state.nodeMap, state.edgeSet, state.edgeList, state.predMap,
    );
    expect(state.nodeMap.get("http://a.org/A")?.label).toBe("A");

    // Second batch: label arrives
    processTriples(
      [{ s: iri("http://a.org/A"), p: iri(RDFS_LABEL), o: lit("Alpha") }],
      state.nodeMap, state.edgeSet, state.edgeList, state.predMap,
    );
    expect(state.nodeMap.get("http://a.org/A")?.label).toBe("Alpha");
  });
});
