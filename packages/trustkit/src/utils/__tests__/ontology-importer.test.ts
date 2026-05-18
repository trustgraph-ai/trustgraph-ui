import { describe, it, expect } from "vitest";
import { OntologyImporter } from "../ontology-importer";

describe("OntologyImporter", () => {
  describe("format detection", () => {
    it("detects OWL/XML from <?xml declaration", () => {
      const xml = `<?xml version="1.0"?>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                 xmlns:owl="http://www.w3.org/2002/07/owl#"
                 xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">
          <owl:Ontology rdf:about="http://example.org/test"/>
        </rdf:RDF>`;
      const result = OntologyImporter.import(xml, "test.owl");
      expect(result.ontology).toBeDefined();
    });

    it("detects Turtle from @prefix", () => {
      const ttl = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
<http://example.org/test> a owl:Ontology .`;
      const result = OntologyImporter.import(ttl, "test.ttl");
      expect(result.ontology).toBeDefined();
    });

    it("detects Turtle from comment lines", () => {
      const ttl = `# A simple ontology
@prefix owl: <http://www.w3.org/2002/07/owl#> .
<http://example.org/test> a owl:Ontology .`;
      const result = OntologyImporter.import(ttl, "test.ttl");
      expect(result.ontology).toBeDefined();
    });

    it("throws on unrecognized format", () => {
      expect(() => OntologyImporter.import("not valid at all", "test.txt")).toThrow("Unrecognized format");
    });
  });

  describe("Turtle parser", () => {
    it("parses a simple ontology with one class", () => {
      const ttl = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix : <http://example.org/onto#> .

<http://example.org/onto#> rdf:type owl:Ontology ;
    rdfs:label "Test Ontology"@en .

:Person rdf:type owl:Class ;
    rdfs:label "Person"@en ;
    rdfs:comment "A human being" .`;

      const result = OntologyImporter.import(ttl);
      expect(result.ontology.metadata.name).toBe("Test Ontology");
      expect(result.ontology.classes).toHaveProperty("Person");
      expect(result.ontology.classes.Person["rdfs:label"]?.[0].value).toBe("Person");
      expect(result.ontology.classes.Person["rdfs:comment"]).toBe("A human being");
    });

    it("handles 'a' shorthand for rdf:type", () => {
      const ttl = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix : <http://example.org/onto#> .

:Animal a owl:Class ;
    rdfs:label "Animal"@en .`;

      const result = OntologyImporter.import(ttl);
      expect(result.ontology.classes).toHaveProperty("Animal");
      expect(result.ontology.classes.Animal["rdfs:label"]?.[0].value).toBe("Animal");
    });

    it("handles prefixes with dots in URLs", () => {
      const ttl = `@prefix sosa: <http://www.w3.org/ns/sosa/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

sosa:Sensor a owl:Class ;
    rdfs:label "Sensor"@en .`;

      const result = OntologyImporter.import(ttl);
      expect(result.ontology.classes).toHaveProperty("Sensor");
      expect(result.ontology.classes.Sensor.uri).toBe("http://www.w3.org/ns/sosa/Sensor");
    });

    it("handles triple-quoted strings", () => {
      const ttl = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix : <http://example.org/onto#> .

:Thing a owl:Class ;
    rdfs:comment """A multi-line
description of a thing
that spans several lines."""@en .`;

      const result = OntologyImporter.import(ttl);
      expect(result.ontology.classes.Thing["rdfs:comment"]).toContain("multi-line");
      expect(result.ontology.classes.Thing["rdfs:comment"]).toContain("\n");
    });

    it("parses object properties with domain and range", () => {
      const ttl = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix : <http://example.org/onto#> .

:Person a owl:Class .
:Organization a owl:Class .

:worksFor a owl:ObjectProperty ;
    rdfs:label "works for"@en ;
    rdfs:domain :Person ;
    rdfs:range :Organization .`;

      const result = OntologyImporter.import(ttl);
      expect(result.ontology.objectProperties).toHaveProperty("worksFor");
      const prop = result.ontology.objectProperties.worksFor;
      expect(prop["rdfs:domain"]).toBe("Person");
      expect(prop["rdfs:range"]).toBe("Organization");
    });

    it("parses datatype properties", () => {
      const ttl = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix : <http://example.org/onto#> .

:Person a owl:Class .

:hasName a owl:DatatypeProperty ;
    rdfs:label "has name"@en ;
    rdfs:domain :Person ;
    rdfs:range xsd:string .`;

      const result = OntologyImporter.import(ttl);
      expect(result.ontology.datatypeProperties).toHaveProperty("hasName");
      const prop = result.ontology.datatypeProperties.hasName;
      expect(prop["rdfs:domain"]).toBe("Person");
      expect(prop["rdfs:range"]).toBe("http://www.w3.org/2001/XMLSchema#string");
    });

    it("handles subclass relationships", () => {
      const ttl = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix : <http://example.org/onto#> .

:Animal a owl:Class .
:Dog a owl:Class ;
    rdfs:subClassOf :Animal .`;

      const result = OntologyImporter.import(ttl);
      expect(result.ontology.classes.Dog["rdfs:subClassOf"]).toBe("Animal");
    });

    it("handles dcterms metadata fallback", () => {
      const ttl = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix dcterms: <http://purl.org/dc/terms/> .

<http://example.org/onto> a owl:Ontology ;
    dcterms:title "DC Title"@en ;
    dcterms:description "DC Description"@en .`;

      const result = OntologyImporter.import(ttl);
      expect(result.ontology.metadata.name).toBe("DC Title");
      expect(result.ontology.metadata.description).toBe("DC Description");
    });

    it("silently skips non-OWL types", () => {
      const ttl = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix : <http://example.org/onto#> .

:myAnnotation a owl:AnnotationProperty .
:myIndividual a owl:NamedIndividual .
:RealClass a owl:Class ;
    rdfs:label "Real"@en .`;

      const result = OntologyImporter.import(ttl);
      expect(result.warnings).toHaveLength(0);
      expect(Object.keys(result.ontology.classes)).toEqual(["RealClass"]);
    });

    it("handles comma-separated objects", () => {
      const ttl = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix : <http://example.org/onto#> .

:multiProp a owl:ObjectProperty , owl:FunctionalProperty .`;

      const result = OntologyImporter.import(ttl);
      expect(result.ontology.objectProperties.multiProp["owl:functionalProperty"]).toBe(true);
    });

    it("warns when no classes or name found", () => {
      const ttl = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
# empty ontology with nothing useful`;

      const result = OntologyImporter.import(ttl);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("No ontology name or classes found");
    });
  });

  // OWL/XML tests require full XML namespace support (getElementsByTagNameNS)
  // which happy-dom doesn't implement — these run in real browsers only
  describe.skip("OWL/XML parser", () => {
    const makeOWL = (body: string, ns = "http://example.org/onto#") => `<?xml version="1.0"?>
<rdf:RDF xmlns="${ns}"
    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
    xmlns:owl="http://www.w3.org/2002/07/owl#"
    xmlns:dcterms="http://purl.org/dc/terms/">
  ${body}
</rdf:RDF>`;

    it("parses ontology metadata", () => {
      const xml = makeOWL(`
        <owl:Ontology rdf:about="http://example.org/onto#">
          <rdfs:label xml:lang="en">My Ontology</rdfs:label>
          <rdfs:comment xml:lang="en">A test ontology</rdfs:comment>
          <owl:versionInfo>1.0</owl:versionInfo>
        </owl:Ontology>`);

      const result = OntologyImporter.import(xml, "test.owl");
      expect(result.ontology.metadata.name).toBe("My Ontology");
      expect(result.ontology.metadata.description).toBe("A test ontology");
      expect(result.ontology.metadata.version).toBe("1.0");
      expect(result.ontology.metadata.namespace).toBe("http://example.org/onto#");
    });

    it("parses classes with labels and comments", () => {
      const xml = makeOWL(`
        <owl:Ontology rdf:about="http://example.org/onto#"/>
        <owl:Class rdf:about="http://example.org/onto#Person">
          <rdfs:label xml:lang="en">Person</rdfs:label>
          <rdfs:comment>A human being</rdfs:comment>
        </owl:Class>`);

      const result = OntologyImporter.import(xml);
      expect(result.ontology.classes.Person).toBeDefined();
      expect(result.ontology.classes.Person["rdfs:label"]?.[0].value).toBe("Person");
      expect(result.ontology.classes.Person["rdfs:comment"]).toBe("A human being");
    });

    it("parses subclass relationships", () => {
      const xml = makeOWL(`
        <owl:Ontology rdf:about="http://example.org/onto#"/>
        <owl:Class rdf:about="http://example.org/onto#Animal"/>
        <owl:Class rdf:about="http://example.org/onto#Dog">
          <rdfs:subClassOf rdf:resource="http://example.org/onto#Animal"/>
        </owl:Class>`);

      const result = OntologyImporter.import(xml);
      expect(result.ontology.classes.Dog["rdfs:subClassOf"]).toBe("Animal");
    });

    it("parses object properties", () => {
      const xml = makeOWL(`
        <owl:Ontology rdf:about="http://example.org/onto#"/>
        <owl:Class rdf:about="http://example.org/onto#Person"/>
        <owl:Class rdf:about="http://example.org/onto#Company"/>
        <owl:ObjectProperty rdf:about="http://example.org/onto#worksFor">
          <rdfs:label xml:lang="en">works for</rdfs:label>
          <rdfs:domain rdf:resource="http://example.org/onto#Person"/>
          <rdfs:range rdf:resource="http://example.org/onto#Company"/>
        </owl:ObjectProperty>`);

      const result = OntologyImporter.import(xml);
      const prop = result.ontology.objectProperties.worksFor;
      expect(prop).toBeDefined();
      expect(prop["rdfs:domain"]).toBe("Person");
      expect(prop["rdfs:range"]).toBe("Company");
    });

    it("parses datatype properties", () => {
      const xml = makeOWL(`
        <owl:Ontology rdf:about="http://example.org/onto#"/>
        <owl:DatatypeProperty rdf:about="http://example.org/onto#hasAge">
          <rdfs:label xml:lang="en">has age</rdfs:label>
          <rdfs:range rdf:resource="http://www.w3.org/2001/XMLSchema#integer"/>
        </owl:DatatypeProperty>`);

      const result = OntologyImporter.import(xml);
      expect(result.ontology.datatypeProperties.hasAge).toBeDefined();
      expect(result.ontology.datatypeProperties.hasAge["rdfs:range"]).toBe("http://www.w3.org/2001/XMLSchema#integer");
    });

    it("falls back to dcterms metadata", () => {
      const xml = makeOWL(`
        <owl:Ontology rdf:about="http://example.org/onto#">
          <dcterms:title>DC Ontology</dcterms:title>
          <dcterms:description>Described via Dublin Core</dcterms:description>
        </owl:Ontology>`);

      const result = OntologyImporter.import(xml);
      expect(result.ontology.metadata.name).toBe("DC Ontology");
      expect(result.ontology.metadata.description).toBe("Described via Dublin Core");
    });

    it("throws on invalid XML", () => {
      expect(() => OntologyImporter.import("<?xml version=\"1.0\"?><broken>")).toThrow();
    });
  });
});
