import { describe, it, expect } from "vitest";
import { OntologyValidator } from "../ontology-validator";
import type { NormalizedOntology, OntologyClass, OntologyProperty } from "@trustgraph/react-state";

const NS = "http://example.org/onto#";

function makeOntology(overrides: Partial<{
  metadata: NormalizedOntology["metadata"];
  classes: [string, OntologyClass][];
  objectProperties: [string, OntologyProperty][];
  datatypeProperties: [string, OntologyProperty][];
}> = {}): NormalizedOntology {
  return {
    metadata: overrides.metadata ?? {
      id: NS,
      name: "Test Ontology",
      description: "A test",
      version: "1.0",
    },
    classes: new Map(overrides.classes ?? []),
    objectProperties: new Map(overrides.objectProperties ?? []),
    datatypeProperties: new Map(overrides.datatypeProperties ?? []),
    otherNodes: [],
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
      const onto = makeOntology({ metadata: { id: NS, name: "", description: "A test", version: "1.0" } });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("name"))).toBe(true);
    });

    it("errors when ontology URI is missing", () => {
      const onto = makeOntology({ metadata: { id: "", name: "Test", description: "A test", version: "1.0" } });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("URI"))).toBe(true);
    });

    it("errors when ontology URI is invalid", () => {
      const onto = makeOntology({ metadata: { id: "not-a-uri", name: "Test", description: "A test", version: "1.0" } });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("Invalid"))).toBe(true);
    });

    it("warns when description is missing", () => {
      const onto = makeOntology({ metadata: { id: NS, name: "Test", description: "", version: "1.0" } });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "warning" && i.message.includes("description"))).toBe(true);
    });
  });

  describe("class validation", () => {
    it("warns when class has no label", () => {
      const onto = makeOntology({
        classes: [[`${NS}Person`, { id: `${NS}Person`, labels: [] }]],
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "warning" && i.itemId === `${NS}Person` && i.message.includes("no label"))).toBe(true);
    });

    it("info when class has no description", () => {
      const onto = makeOntology({
        classes: [[`${NS}Person`, { id: `${NS}Person`, labels: [{ value: "Person", lang: "en" }] }]],
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "info" && i.itemId === `${NS}Person` && i.message.includes("no description"))).toBe(true);
    });

    it("errors when subclass references non-existent class", () => {
      const onto = makeOntology({
        classes: [[`${NS}Dog`, { id: `${NS}Dog`, labels: [{ value: "Dog" }], subClassOf: [`${NS}NonExistent`] }]],
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("non-existent parent"))).toBe(true);
    });

    it("does not error for well-known external class references", () => {
      const onto = makeOntology({
        classes: [[`${NS}Dog`, { id: `${NS}Dog`, labels: [{ value: "Dog" }], subClassOf: ["http://www.w3.org/2002/07/owl#Thing"] }]],
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("non-existent parent"))).toBe(false);
    });
  });

  describe("property validation", () => {
    it("errors when object property domain references non-existent class", () => {
      const onto = makeOntology({
        objectProperties: [[`${NS}hasPart`, { id: `${NS}hasPart`, propertyType: "object", labels: [{ value: "has part" }], domain: `${NS}NonExistent` }]],
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("non-existent domain"))).toBe(true);
    });

    it("errors when object property range references non-existent class", () => {
      const onto = makeOntology({
        classes: [[`${NS}Person`, { id: `${NS}Person`, labels: [] }]],
        objectProperties: [[`${NS}knows`, { id: `${NS}knows`, propertyType: "object", labels: [{ value: "knows" }], domain: `${NS}Person`, range: `${NS}Ghost` }]],
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
        objectProperties: [[`${NS}hasPart`, { id: `${NS}hasPart`, propertyType: "object", labels: [] }]],
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "warning" && i.message.includes("no classes"))).toBe(true);
    });

    it("detects circular subclass dependencies", () => {
      const onto = makeOntology({
        classes: [
          [`${NS}A`, { id: `${NS}A`, labels: [], subClassOf: [`${NS}B`] }],
          [`${NS}B`, { id: `${NS}B`, labels: [], subClassOf: [`${NS}A`] }],
        ],
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "error" && i.message.includes("Circular dependency"))).toBe(true);
    });

    it("detects isolated classes", () => {
      const onto = makeOntology({
        classes: [
          [`${NS}Lonely`, { id: `${NS}Lonely`, labels: [{ value: "Lonely" }], comment: "All alone" }],
          [`${NS}Connected`, { id: `${NS}Connected`, labels: [{ value: "Connected" }], comment: "Used by a property" }],
        ],
        objectProperties: [
          [`${NS}uses`, { id: `${NS}uses`, propertyType: "object", labels: [{ value: "uses" }], domain: `${NS}Connected` }],
        ],
      });
      const result = OntologyValidator.validate(onto);
      expect(result.issues.some((i) => i.type === "info" && i.itemId === `${NS}Lonely` && i.message.includes("not connected"))).toBe(true);
      expect(result.issues.some((i) => i.itemId === `${NS}Connected` && i.message.includes("not connected"))).toBe(false);
    });
  });

  describe("summary", () => {
    it("isValid is true when no errors", () => {
      const onto = makeOntology({
        classes: [[`${NS}Person`, { id: `${NS}Person`, labels: [{ value: "Person" }], comment: "A person" }]],
      });
      const result = OntologyValidator.validate(onto);
      expect(result.isValid).toBe(true);
    });

    it("isValid is false when there are errors", () => {
      const onto = makeOntology({ metadata: { id: NS, name: "", description: "A test", version: "1.0" } });
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
