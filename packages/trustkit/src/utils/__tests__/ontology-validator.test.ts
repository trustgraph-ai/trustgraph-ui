import { describe, it, expect } from "vitest";
import { OntologyValidator } from "../ontology-validator";
import type { Ontology } from "@trustgraph/react-state";

function makeOntology(overrides: Partial<Ontology> = {}): Ontology {
  return {
    metadata: {
      name: "Test Ontology",
      description: "A test",
      version: "1.0",
      created: "2024-01-01",
      modified: "2024-01-01",
      creator: "test",
      namespace: "http://example.org/onto#",
    },
    classes: {},
    objectProperties: {},
    datatypeProperties: {},
    ...overrides,
  };
}

describe("OntologyValidator", () => {
  describe("metadata validation", () => {
    it("passes for valid metadata", () => {
      const result = OntologyValidator.validate(makeOntology());
      const metadataErrors = result.issues.filter((i) => i.category === "metadata" && i.type === "error");
      expect(metadataErrors).toHaveLength(0);
    });

    it("errors when name is missing", () => {
      const onto = makeOntology();
      onto.metadata.name = "";
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("name"))).toBe(true);
    });

    it("errors when namespace is missing", () => {
      const onto = makeOntology();
      onto.metadata.namespace = "";
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("Namespace"))).toBe(true);
    });

    it("errors when namespace is invalid URI", () => {
      const onto = makeOntology();
      onto.metadata.namespace = "not-a-uri";
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("Invalid namespace"))).toBe(true);
    });

    it("warns when description is missing", () => {
      const onto = makeOntology();
      onto.metadata.description = "";
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "warning" && i.message.includes("description"))).toBe(true);
    });
  });

  describe("class validation", () => {
    it("warns when class has no label", () => {
      const onto = makeOntology({
        classes: {
          Person: { uri: "http://example.org/onto#Person", type: "owl:Class" },
        },
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "warning" && i.itemId === "Person" && i.message.includes("no label"))).toBe(true);
    });

    it("info when class has no description", () => {
      const onto = makeOntology({
        classes: {
          Person: {
            uri: "http://example.org/onto#Person",
            type: "owl:Class",
            "rdfs:label": [{ value: "Person", lang: "en" }],
          },
        },
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "info" && i.itemId === "Person" && i.message.includes("no description"))).toBe(true);
    });

    it("errors when subclass references non-existent class", () => {
      const onto = makeOntology({
        classes: {
          Dog: {
            uri: "http://example.org/onto#Dog",
            type: "owl:Class",
            "rdfs:label": [{ value: "Dog" }],
            "rdfs:subClassOf": "NonExistent",
          },
        },
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("non-existent parent"))).toBe(true);
    });

    it("does not error for standard external class references", () => {
      const onto = makeOntology({
        classes: {
          Dog: {
            uri: "http://example.org/onto#Dog",
            type: "owl:Class",
            "rdfs:label": [{ value: "Dog" }],
            "rdfs:subClassOf": "Thing",
          },
        },
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("non-existent parent"))).toBe(false);
    });
  });

  describe("property validation", () => {
    it("errors when object property domain references non-existent class", () => {
      const onto = makeOntology({
        objectProperties: {
          hasPart: {
            uri: "http://example.org/onto#hasPart",
            type: "owl:ObjectProperty",
            "rdfs:label": [{ value: "has part" }],
            "rdfs:domain": "NonExistent",
          },
        },
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("non-existent domain"))).toBe(true);
    });

    it("errors when object property range references non-existent class", () => {
      const onto = makeOntology({
        classes: { Person: { uri: "http://example.org/onto#Person", type: "owl:Class" } },
        objectProperties: {
          knows: {
            uri: "http://example.org/onto#knows",
            type: "owl:ObjectProperty",
            "rdfs:label": [{ value: "knows" }],
            "rdfs:domain": "Person",
            "rdfs:range": "Ghost",
          },
        },
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("non-existent range"))).toBe(true);
    });
  });

  describe("structure validation", () => {
    it("info when ontology is empty", () => {
      const onto = makeOntology();
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "info" && i.message.includes("empty"))).toBe(true);
    });

    it("warns when ontology has no classes but has properties", () => {
      const onto = makeOntology({
        objectProperties: {
          hasPart: { uri: "http://example.org/onto#hasPart", type: "owl:ObjectProperty" },
        },
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "warning" && i.message.includes("no classes"))).toBe(true);
    });

    it("detects circular subclass dependencies", () => {
      const onto = makeOntology({
        classes: {
          A: { uri: "http://example.org/onto#A", type: "owl:Class", "rdfs:subClassOf": "B" },
          B: { uri: "http://example.org/onto#B", type: "owl:Class", "rdfs:subClassOf": "A" },
        },
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("Circular dependency"))).toBe(true);
    });

    it("detects isolated classes", () => {
      const onto = makeOntology({
        classes: {
          Lonely: {
            uri: "http://example.org/onto#Lonely",
            type: "owl:Class",
            "rdfs:label": [{ value: "Lonely" }],
            "rdfs:comment": "All alone",
          },
          Connected: {
            uri: "http://example.org/onto#Connected",
            type: "owl:Class",
            "rdfs:label": [{ value: "Connected" }],
            "rdfs:comment": "Used by a property",
          },
        },
        objectProperties: {
          uses: {
            uri: "http://example.org/onto#uses",
            type: "owl:ObjectProperty",
            "rdfs:label": [{ value: "uses" }],
            "rdfs:domain": "Connected",
          },
        },
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "info" && i.itemId === "Lonely" && i.message.includes("not connected"))).toBe(true);
      expect(result.issues.some((i) => i.itemId === "Connected" && i.message.includes("not connected"))).toBe(false);
    });
  });

  describe("summary", () => {
    it("isValid is true when no errors", () => {
      const onto = makeOntology({
        classes: {
          Person: {
            uri: "http://example.org/onto#Person",
            type: "owl:Class",
            "rdfs:label": [{ value: "Person" }],
            "rdfs:comment": "A person",
          },
        },
      });
      const result = OntologyValidator.validate(onto);
      expect(result.isValid).toBe(true);
    });

    it("isValid is false when there are errors", () => {
      const onto = makeOntology();
      onto.metadata.name = "";
      const result = OntologyValidator.validate(onto);
      expect(result.isValid).toBe(false);
      expect(result.summary.errors).toBeGreaterThan(0);
    });

    it("counts errors, warnings, and info separately", () => {
      const onto = makeOntology();
      const result = OntologyValidator.validate(onto);
      expect(result.summary.errors + result.summary.warnings + result.summary.info).toBe(result.issues.length);
    });
  });
});
