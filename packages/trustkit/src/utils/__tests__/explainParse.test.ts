import { describe, it, expect } from "vitest";
import { parseExplainEvent } from "../explainParse";
import type { Triple } from "@trustgraph/react-state";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const PROV = "http://www.w3.org/ns/prov#";
const TG = "https://trustgraph.ai/ns/";
const OWL = "http://www.w3.org/2002/07/owl#";

const EVENT = "http://example.org/event/1";

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

describe("parseExplainEvent", () => {
  it("returns empty result for no triples", () => {
    const result = parseExplainEvent(EVENT, []);
    expect(result.uri).toBe(EVENT);
    expect(result.types).toHaveLength(0);
    expect(result.derivedFrom).toHaveLength(0);
    expect(result.concepts).toHaveLength(0);
  });

  it("extracts rdf:type URIs", () => {
    const triples: Triple[] = [
      triple(EVENT, RDF_TYPE, TG + "Question"),
      triple(EVENT, RDF_TYPE, PROV + "Entity"),
    ];
    const result = parseExplainEvent(EVENT, triples);
    expect(result.types).toEqual([TG + "Question", PROV + "Entity"]);
  });

  it("classifies known type names", () => {
    const triples: Triple[] = [
      triple(EVENT, RDF_TYPE, TG + "Question"),
      triple(EVENT, RDF_TYPE, PROV + "Entity"),
    ];
    const result = parseExplainEvent(EVENT, triples);
    expect(result.typeNames).toEqual(["Question", "Entity"]);
    expect(result.knownTypes.has("Question")).toBe(true);
    expect(result.knownTypes.has("Entity")).toBe(true);
    expect(result.unknownTypeNames).toHaveLength(0);
  });

  it("tracks unknown type names", () => {
    const triples: Triple[] = [
      triple(EVENT, RDF_TYPE, OWL + "SomethingWeird"),
    ];
    const result = parseExplainEvent(EVENT, triples);
    expect(result.unknownTypeNames).toEqual(["SomethingWeird"]);
    expect(result.knownTypes.size).toBe(0);
  });

  it("extracts rdfs:label", () => {
    const triples: Triple[] = [
      { s: iri(EVENT), p: iri(RDFS_LABEL), o: lit("My Event") },
    ];
    const result = parseExplainEvent(EVENT, triples);
    expect(result.label).toBe("My Event");
  });

  it("extracts prov:startedAtTime", () => {
    const triples: Triple[] = [
      { s: iri(EVENT), p: iri(PROV + "startedAtTime"), o: lit("2024-01-01T00:00:00Z") },
    ];
    const result = parseExplainEvent(EVENT, triples);
    expect(result.startedAt).toBe("2024-01-01T00:00:00Z");
  });

  it("extracts prov:wasDerivedFrom (multi-valued)", () => {
    const triples: Triple[] = [
      triple(EVENT, PROV + "wasDerivedFrom", "http://example.org/event/0"),
      triple(EVENT, PROV + "wasDerivedFrom", "http://example.org/event/2"),
    ];
    const result = parseExplainEvent(EVENT, triples);
    expect(result.derivedFrom).toHaveLength(2);
  });

  it("extracts prov:wasGeneratedBy", () => {
    const triples: Triple[] = [
      triple(EVENT, PROV + "wasGeneratedBy", "http://example.org/activity/1"),
    ];
    const result = parseExplainEvent(EVENT, triples);
    expect(result.generatedBy).toEqual(["http://example.org/activity/1"]);
  });

  describe("TrustGraph predicates", () => {
    it("extracts query", () => {
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "query"), o: lit("What is AI?") },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.query).toBe("What is AI?");
    });

    it("extracts action and arguments", () => {
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "action"), o: lit("search") },
        { s: iri(EVENT), p: iri(TG + "arguments"), o: lit('{"q":"test"}') },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.action).toBe("search");
      expect(result.arguments).toBe('{"q":"test"}');
    });

    it("extracts thought and observation URIs", () => {
      const triples: Triple[] = [
        triple(EVENT, TG + "thought", "http://example.org/thought/1"),
        triple(EVENT, TG + "observation", "http://example.org/obs/1"),
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.thoughtUri).toBe("http://example.org/thought/1");
      expect(result.observationUri).toBe("http://example.org/obs/1");
    });

    it("extracts multi-valued concepts", () => {
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "concept"), o: lit("machine learning") },
        { s: iri(EVENT), p: iri(TG + "concept"), o: lit("neural networks") },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.concepts).toEqual(["machine learning", "neural networks"]);
    });

    it("extracts multi-valued entities", () => {
      const triples: Triple[] = [
        triple(EVENT, TG + "entity", "http://example.org/entity/1"),
        triple(EVENT, TG + "entity", "http://example.org/entity/2"),
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.entities).toHaveLength(2);
    });

    it("parses edgeCount as integer", () => {
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "edgeCount"), o: lit("42") },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.edgeCount).toBe(42);
    });

    it("handles invalid edgeCount gracefully", () => {
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "edgeCount"), o: lit("not-a-number") },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.edgeCount).toBeUndefined();
    });

    it("extracts selectedEdges and edges", () => {
      const triples: Triple[] = [
        triple(EVENT, TG + "selectedEdge", "http://example.org/edge/1"),
        triple(EVENT, TG + "edge", "http://example.org/edge/content/1"),
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.selectedEdges).toHaveLength(1);
      expect(result.edges).toHaveLength(1);
    });

    it("extracts reasonings", () => {
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "reasoning"), o: lit("This is relevant because...") },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.reasonings).toEqual(["This is relevant because..."]);
    });

    it("parses chunkCount and selectedChunks", () => {
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "chunkCount"), o: lit("10") },
        triple(EVENT, TG + "selectedChunk", "http://example.org/chunk/1"),
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.chunkCount).toBe(10);
      expect(result.selectedChunks).toHaveLength(1);
    });

    it("extracts document URI", () => {
      const triples: Triple[] = [
        triple(EVENT, TG + "document", "http://example.org/doc/1"),
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.document).toBe("http://example.org/doc/1");
    });

    it("extracts subagentGoals and planSteps", () => {
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "subagentGoal"), o: lit("Find data") },
        { s: iri(EVENT), p: iri(TG + "planStep"), o: lit("Step 1: search") },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.subagentGoals).toEqual(["Find data"]);
      expect(result.planSteps).toEqual(["Step 1: search"]);
    });

    it("extracts toolCandidates", () => {
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "toolCandidate"), o: lit("search") },
        { s: iri(EVENT), p: iri(TG + "toolCandidate"), o: lit("calculate") },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.toolCandidates).toEqual(["search", "calculate"]);
    });

    it("parses instrumentation integers", () => {
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "stepNumber"), o: lit("3") },
        { s: iri(EVENT), p: iri(TG + "inToken"), o: lit("1500") },
        { s: iri(EVENT), p: iri(TG + "outToken"), o: lit("200") },
        { s: iri(EVENT), p: iri(TG + "llmDurationMs"), o: lit("4500") },
        { s: iri(EVENT), p: iri(TG + "toolDurationMs"), o: lit("120") },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.stepNumber).toBe(3);
      expect(result.inToken).toBe(1500);
      expect(result.outToken).toBe(200);
      expect(result.llmDurationMs).toBe(4500);
      expect(result.toolDurationMs).toBe(120);
    });

    it("extracts string predicates", () => {
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "llmModel"), o: lit("claude-3") },
        { s: iri(EVENT), p: iri(TG + "terminationReason"), o: lit("max_steps") },
        { s: iri(EVENT), p: iri(TG + "toolError"), o: lit("timeout") },
        { s: iri(EVENT), p: iri(TG + "pattern"), o: lit("rag") },
        { s: iri(EVENT), p: iri(TG + "taskType"), o: lit("factual") },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.llmModel).toBe("claude-3");
      expect(result.terminationReason).toBe("max_steps");
      expect(result.toolError).toBe("timeout");
      expect(result.pattern).toBe("rag");
      expect(result.taskType).toBe("factual");
    });
  });

  describe("filtering and extras", () => {
    it("ignores triples about other subjects", () => {
      const other = "http://example.org/other";
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(TG + "query"), o: lit("mine") },
        { s: iri(other), p: iri(TG + "query"), o: lit("not mine") },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.query).toBe("mine");
    });

    it("collects unknown predicates into extraPredicates", () => {
      const customPred = "http://example.org/custom/foo";
      const triples: Triple[] = [
        { s: iri(EVENT), p: iri(customPred), o: lit("bar") },
        { s: iri(EVENT), p: iri(customPred), o: lit("baz") },
      ];
      const result = parseExplainEvent(EVENT, triples);
      expect(result.extraPredicates).toHaveLength(1);
      expect(result.extraPredicates[0].predicate).toBe(customPred);
      expect(result.extraPredicates[0].predicateName).toBe("foo");
      expect(result.extraPredicates[0].values).toEqual(["bar", "baz"]);
    });

    it("handles a full realistic event", () => {
      const triples: Triple[] = [
        triple(EVENT, RDF_TYPE, TG + "Exploration"),
        triple(EVENT, RDF_TYPE, PROV + "Entity"),
        { s: iri(EVENT), p: iri(RDFS_LABEL), o: lit("Graph Exploration") },
        { s: iri(EVENT), p: iri(PROV + "startedAtTime"), o: lit("2024-06-15T10:30:00Z") },
        triple(EVENT, PROV + "wasDerivedFrom", "http://example.org/event/0"),
        { s: iri(EVENT), p: iri(TG + "query"), o: lit("What is quantum computing?") },
        { s: iri(EVENT), p: iri(TG + "concept"), o: lit("quantum computing") },
        { s: iri(EVENT), p: iri(TG + "concept"), o: lit("qubits") },
        triple(EVENT, TG + "entity", "http://example.org/entity/qc"),
        { s: iri(EVENT), p: iri(TG + "edgeCount"), o: lit("15") },
        triple(EVENT, TG + "selectedEdge", "http://example.org/edge/1"),
        triple(EVENT, TG + "selectedEdge", "http://example.org/edge/2"),
      ];

      const result = parseExplainEvent(EVENT, triples);
      expect(result.knownTypes.has("Exploration")).toBe(true);
      expect(result.knownTypes.has("Entity")).toBe(true);
      expect(result.label).toBe("Graph Exploration");
      expect(result.startedAt).toBe("2024-06-15T10:30:00Z");
      expect(result.derivedFrom).toHaveLength(1);
      expect(result.query).toBe("What is quantum computing?");
      expect(result.concepts).toHaveLength(2);
      expect(result.entities).toHaveLength(1);
      expect(result.edgeCount).toBe(15);
      expect(result.selectedEdges).toHaveLength(2);
    });
  });
});
