import { describe, it, expect } from "vitest";
import { OntologyExporter } from "../ontology-exporter";
import type { NormalizedOntology, OntologyClass, OntologyProperty } from "@trustgraph/react-state";

const NS = "http://example.org/onto#";

function makeOntology(): NormalizedOntology {
  return {
    metadata: { id: NS, name: "Test Ontology", description: "A test", version: "1.0" },
    classes: new Map<string, OntologyClass>([
      [`${NS}Person`, { id: `${NS}Person`, labels: [{ value: "Person", lang: "en" }], comment: "A human being" }],
      [`${NS}Student`, { id: `${NS}Student`, labels: [{ value: "Student", lang: "en" }], subClassOf: [`${NS}Person`] }],
    ]),
    objectProperties: new Map<string, OntologyProperty>([
      [`${NS}knows`, { id: `${NS}knows`, propertyType: "object", labels: [{ value: "knows", lang: "en" }], domain: `${NS}Person`, range: `${NS}Person` }],
    ]),
    datatypeProperties: new Map<string, OntologyProperty>([
      [`${NS}hasName`, { id: `${NS}hasName`, propertyType: "datatype", labels: [{ value: "has name", lang: "en" }], domain: `${NS}Person`, range: "http://www.w3.org/2001/XMLSchema#string" }],
    ]),
    otherNodes: [],
  };
}

describe("OntologyExporter", () => {
  describe("OWL/XML export", () => {
    it("produces valid XML structure", () => {
      const xml = OntologyExporter.export(makeOntology(), { format: "owl" });
      expect(xml).toContain('<?xml version="1.0"?>');
      expect(xml).toContain("<rdf:RDF");
      expect(xml).toContain("</rdf:RDF>");
    });

    it("includes ontology metadata", () => {
      const xml = OntologyExporter.export(makeOntology(), { format: "owl" });
      expect(xml).toContain("Test Ontology");
      expect(xml).toContain("A test");
      expect(xml).toContain("<owl:versionInfo>1.0</owl:versionInfo>");
    });

    it("includes classes with labels", () => {
      const xml = OntologyExporter.export(makeOntology(), { format: "owl" });
      expect(xml).toContain('owl:Class rdf:about="http://example.org/onto#Person"');
      expect(xml).toContain(">Person</rdfs:label>");
    });

    it("includes subclass relationships", () => {
      const xml = OntologyExporter.export(makeOntology(), { format: "owl" });
      expect(xml).toContain('rdfs:subClassOf rdf:resource="http://example.org/onto#Person"');
    });

    it("includes object properties", () => {
      const xml = OntologyExporter.export(makeOntology(), { format: "owl" });
      expect(xml).toContain('owl:ObjectProperty rdf:about="http://example.org/onto#knows"');
      expect(xml).toContain('rdfs:domain rdf:resource="http://example.org/onto#Person"');
    });

    it("includes datatype properties", () => {
      const xml = OntologyExporter.export(makeOntology(), { format: "owl" });
      expect(xml).toContain('owl:DatatypeProperty rdf:about="http://example.org/onto#hasName"');
    });

    it("escapes XML special characters", () => {
      const onto = makeOntology();
      onto.metadata.name = "Test & <Ontology>";
      const xml = OntologyExporter.export(onto, { format: "owl" });
      expect(xml).toContain("Test &amp; &lt;Ontology&gt;");
    });

    it("omits comments when includeComments is false", () => {
      const xml = OntologyExporter.export(makeOntology(), { format: "owl", includeComments: false });
      expect(xml).not.toContain("A human being");
      expect(xml).not.toContain("A test");
    });

    it("RDF format uses same output as OWL", () => {
      const onto = makeOntology();
      const owl = OntologyExporter.export(onto, { format: "owl" });
      const rdf = OntologyExporter.export(onto, { format: "rdf" });
      expect(owl).toBe(rdf);
    });
  });

  describe("Turtle export", () => {
    it("includes prefix declarations", () => {
      const ttl = OntologyExporter.export(makeOntology(), { format: "turtle" });
      expect(ttl).toContain("@prefix owl:");
      expect(ttl).toContain("@prefix rdfs:");
      expect(ttl).toContain("@prefix rdf:");
    });

    it("includes ontology declaration", () => {
      const ttl = OntologyExporter.export(makeOntology(), { format: "turtle" });
      expect(ttl).toContain("rdf:type owl:Ontology");
      expect(ttl).toContain('"Test Ontology"@en');
    });

    it("includes classes", () => {
      const ttl = OntologyExporter.export(makeOntology(), { format: "turtle" });
      expect(ttl).toContain(":Person rdf:type owl:Class");
      expect(ttl).toContain('"Person"@en');
    });

    it("includes subclass relationships", () => {
      const ttl = OntologyExporter.export(makeOntology(), { format: "turtle" });
      expect(ttl).toContain("rdfs:subClassOf :Person");
    });

    it("includes object properties", () => {
      const ttl = OntologyExporter.export(makeOntology(), { format: "turtle" });
      expect(ttl).toContain(":knows rdf:type owl:ObjectProperty");
    });

    it("includes datatype properties", () => {
      const ttl = OntologyExporter.export(makeOntology(), { format: "turtle" });
      expect(ttl).toContain(":hasName rdf:type owl:DatatypeProperty");
    });

    it("escapes special characters in strings", () => {
      const onto = makeOntology();
      onto.metadata.name = 'Test "quoted" ontology';
      const ttl = OntologyExporter.export(onto, { format: "turtle" });
      expect(ttl).toContain('Test \\"quoted\\" ontology');
    });
  });

  describe("JSON-LD export", () => {
    it("produces valid JSON-LD array", () => {
      const jsonld = OntologyExporter.export(makeOntology(), { format: "json-ld" });
      const parsed = JSON.parse(jsonld);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it("includes ontology metadata node", () => {
      const jsonld = OntologyExporter.export(makeOntology(), { format: "json-ld" });
      const parsed = JSON.parse(jsonld);
      const ontoNode = parsed.find((n: any) => n["@type"]?.includes("http://www.w3.org/2002/07/owl#Ontology"));
      expect(ontoNode).toBeDefined();
      expect(ontoNode["@id"]).toBe(NS);
    });
  });

  describe("utility methods", () => {
    it("getFileExtension returns correct extensions", () => {
      expect(OntologyExporter.getFileExtension("owl")).toBe(".owl");
      expect(OntologyExporter.getFileExtension("rdf")).toBe(".rdf");
      expect(OntologyExporter.getFileExtension("turtle")).toBe(".ttl");
      expect(OntologyExporter.getFileExtension("json-ld")).toBe(".jsonld");
    });

    it("getMimeType returns correct types", () => {
      expect(OntologyExporter.getMimeType("owl")).toBe("application/rdf+xml");
      expect(OntologyExporter.getMimeType("rdf")).toBe("application/rdf+xml");
      expect(OntologyExporter.getMimeType("turtle")).toBe("text/turtle");
      expect(OntologyExporter.getMimeType("json-ld")).toBe("application/ld+json");
    });
  });

  describe("round-trip", () => {
    it("Turtle export can be re-imported", async () => {
      const original = makeOntology();
      const ttl = OntologyExporter.export(original, { format: "turtle" });
      const { OntologyImporter } = await import("../ontology-importer");
      const reimported = OntologyImporter.import(ttl, "test.ttl");

      expect(reimported.ontology.metadata.name).toBe("Test Ontology");
      expect(reimported.ontology.classes.has(`${NS}Person`)).toBe(true);
      expect(reimported.ontology.classes.has(`${NS}Student`)).toBe(true);
      expect(reimported.ontology.objectProperties.has(`${NS}knows`)).toBe(true);
      expect(reimported.ontology.datatypeProperties.has(`${NS}hasName`)).toBe(true);
    });
  });
});
