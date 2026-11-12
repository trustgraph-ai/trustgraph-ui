import type { NormalizedOntology } from "@trustgraph/react-state";
import { denormalizeToJsonLd } from "@trustgraph/react-state";

export interface ExportOptions {
  format: "owl" | "rdf" | "turtle" | "json-ld";
  includeComments?: boolean;
  includeNamespaces?: boolean;
}

export class OntologyExporter {
  static export(ontology: NormalizedOntology, options: ExportOptions): string {
    switch (options.format) {
      case "owl": return this.exportToOWL(ontology, options);
      case "rdf": return this.exportToOWL(ontology, options);
      case "turtle": return this.exportToTurtle(ontology, options);
      case "json-ld": return this.exportToJsonLd(ontology);
      default: throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private static exportToJsonLd(ontology: NormalizedOntology): string {
    return JSON.stringify(denormalizeToJsonLd(ontology), null, 2);
  }

  private static exportToOWL(ontology: NormalizedOntology, options: ExportOptions): string {
    const ns = ontology.metadata.id || "http://example.org/ontology#";
    const lines: string[] = [];
    lines.push('<?xml version="1.0"?>');
    lines.push('<rdf:RDF xmlns="' + ns + '"');
    lines.push('     xml:base="' + ns + '"');
    lines.push('     xmlns:owl="http://www.w3.org/2002/07/owl#"');
    lines.push('     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"');
    lines.push('     xmlns:xml="http://www.w3.org/XML/1998/namespace"');
    lines.push('     xmlns:xsd="http://www.w3.org/2001/XMLSchema#"');
    lines.push('     xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">');
    lines.push('    <owl:Ontology rdf:about="' + ns + '">');
    if (ontology.metadata.name) lines.push('        <rdfs:label xml:lang="en">' + this.escapeXML(ontology.metadata.name) + "</rdfs:label>");
    if (ontology.metadata.description && options.includeComments !== false) lines.push('        <rdfs:comment xml:lang="en">' + this.escapeXML(ontology.metadata.description) + "</rdfs:comment>");
    if (ontology.metadata.version) lines.push("        <owl:versionInfo>" + this.escapeXML(ontology.metadata.version) + "</owl:versionInfo>");
    lines.push("    </owl:Ontology>");
    lines.push("");

    for (const cls of ontology.classes.values()) {
      lines.push('    <owl:Class rdf:about="' + cls.id + '">');
      for (const label of cls.labels) {
        const langAttr = label.lang ? ` xml:lang="${label.lang}"` : "";
        lines.push("        <rdfs:label" + langAttr + ">" + this.escapeXML(label.value) + "</rdfs:label>");
      }
      if (cls.comment && options.includeComments !== false) lines.push('        <rdfs:comment xml:lang="en">' + this.escapeXML(cls.comment) + "</rdfs:comment>");
      if (cls.subClassOf) {
        for (const parentUri of cls.subClassOf) {
          lines.push('        <rdfs:subClassOf rdf:resource="' + parentUri + '"/>');
        }
      }
      lines.push("    </owl:Class>");
      lines.push("");
    }

    for (const prop of ontology.objectProperties.values()) {
      lines.push('    <owl:ObjectProperty rdf:about="' + prop.id + '">');
      for (const label of prop.labels) {
        const langAttr = label.lang ? ` xml:lang="${label.lang}"` : "";
        lines.push("        <rdfs:label" + langAttr + ">" + this.escapeXML(label.value) + "</rdfs:label>");
      }
      if (prop.comment && options.includeComments !== false) lines.push('        <rdfs:comment xml:lang="en">' + this.escapeXML(prop.comment) + "</rdfs:comment>");
      if (prop.domain) lines.push('        <rdfs:domain rdf:resource="' + prop.domain + '"/>');
      if (prop.range) lines.push('        <rdfs:range rdf:resource="' + prop.range + '"/>');
      if (prop.inverseOf) lines.push('        <owl:inverseOf rdf:resource="' + prop.inverseOf + '"/>');
      if (prop.functional) lines.push('        <rdf:type rdf:resource="http://www.w3.org/2002/07/owl#FunctionalProperty"/>');
      if (prop.inverseFunctional) lines.push('        <rdf:type rdf:resource="http://www.w3.org/2002/07/owl#InverseFunctionalProperty"/>');
      lines.push("    </owl:ObjectProperty>");
      lines.push("");
    }

    for (const prop of ontology.datatypeProperties.values()) {
      lines.push('    <owl:DatatypeProperty rdf:about="' + prop.id + '">');
      for (const label of prop.labels) {
        const langAttr = label.lang ? ` xml:lang="${label.lang}"` : "";
        lines.push("        <rdfs:label" + langAttr + ">" + this.escapeXML(label.value) + "</rdfs:label>");
      }
      if (prop.comment && options.includeComments !== false) lines.push('        <rdfs:comment xml:lang="en">' + this.escapeXML(prop.comment) + "</rdfs:comment>");
      if (prop.domain) lines.push('        <rdfs:domain rdf:resource="' + prop.domain + '"/>');
      if (prop.range) lines.push('        <rdfs:range rdf:resource="' + prop.range + '"/>');
      if (prop.functional) lines.push('        <rdf:type rdf:resource="http://www.w3.org/2002/07/owl#FunctionalProperty"/>');
      lines.push("    </owl:DatatypeProperty>");
      lines.push("");
    }

    lines.push("</rdf:RDF>");
    return lines.join("\n");
  }

  private static exportToTurtle(ontology: NormalizedOntology, options: ExportOptions): string {
    const ns = ontology.metadata.id || "http://example.org/ontology#";
    const lines: string[] = [];
    lines.push("@prefix : <" + ns + "> .");
    lines.push("@prefix owl: <http://www.w3.org/2002/07/owl#> .");
    lines.push("@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .");
    lines.push("@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .");
    lines.push("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .");
    lines.push("@base <" + ns + "> .");
    lines.push("");
    lines.push("<" + ns + "> rdf:type owl:Ontology");
    if (ontology.metadata.name) lines.push('    ; rdfs:label "' + this.escapeTurtle(ontology.metadata.name) + '"@en');
    if (ontology.metadata.description && options.includeComments !== false) lines.push('    ; rdfs:comment "' + this.escapeTurtle(ontology.metadata.description) + '"@en');
    if (ontology.metadata.version) lines.push('    ; owl:versionInfo "' + this.escapeTurtle(ontology.metadata.version) + '"');
    lines.push("    .");
    lines.push("");

    for (const cls of ontology.classes.values()) {
      lines.push(this.turtleRef(cls.id, ns) + " rdf:type owl:Class");
      for (const label of cls.labels) {
        lines.push('    ; rdfs:label "' + this.escapeTurtle(label.value) + '"' + (label.lang ? `@${label.lang}` : ""));
      }
      if (cls.comment && options.includeComments !== false) lines.push('    ; rdfs:comment "' + this.escapeTurtle(cls.comment) + '"@en');
      if (cls.subClassOf) {
        for (const parentUri of cls.subClassOf) {
          lines.push("    ; rdfs:subClassOf " + this.turtleRef(parentUri, ns));
        }
      }
      lines.push("    .");
      lines.push("");
    }

    for (const prop of ontology.objectProperties.values()) {
      lines.push(this.turtleRef(prop.id, ns) + " rdf:type owl:ObjectProperty");
      for (const label of prop.labels) {
        lines.push('    ; rdfs:label "' + this.escapeTurtle(label.value) + '"' + (label.lang ? `@${label.lang}` : ""));
      }
      if (prop.comment && options.includeComments !== false) lines.push('    ; rdfs:comment "' + this.escapeTurtle(prop.comment) + '"@en');
      if (prop.domain) lines.push("    ; rdfs:domain " + this.turtleRef(prop.domain, ns));
      if (prop.range) lines.push("    ; rdfs:range " + this.turtleRef(prop.range, ns));
      lines.push("    .");
      lines.push("");
    }

    for (const prop of ontology.datatypeProperties.values()) {
      lines.push(this.turtleRef(prop.id, ns) + " rdf:type owl:DatatypeProperty");
      for (const label of prop.labels) {
        lines.push('    ; rdfs:label "' + this.escapeTurtle(label.value) + '"' + (label.lang ? `@${label.lang}` : ""));
      }
      if (prop.comment && options.includeComments !== false) lines.push('    ; rdfs:comment "' + this.escapeTurtle(prop.comment) + '"@en');
      if (prop.domain) lines.push("    ; rdfs:domain " + this.turtleRef(prop.domain, ns));
      if (prop.range) lines.push("    ; rdfs:range " + this.turtleRef(prop.range, ns));
      lines.push("    .");
      lines.push("");
    }

    return lines.join("\n");
  }

  private static turtleRef(uri: string, baseNs: string): string {
    if (baseNs && uri.startsWith(baseNs)) return ":" + uri.slice(baseNs.length);
    return "<" + uri + ">";
  }

  private static escapeXML(t: string): string {
    return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  private static escapeTurtle(t: string): string {
    return t.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
  }

  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static getFileExtension(format: ExportOptions["format"]): string {
    switch (format) {
      case "turtle": return ".ttl";
      case "owl": return ".owl";
      case "json-ld": return ".jsonld";
      default: return ".rdf";
    }
  }

  static getMimeType(format: ExportOptions["format"]): string {
    switch (format) {
      case "turtle": return "text/turtle";
      case "json-ld": return "application/ld+json";
      default: return "application/rdf+xml";
    }
  }
}
