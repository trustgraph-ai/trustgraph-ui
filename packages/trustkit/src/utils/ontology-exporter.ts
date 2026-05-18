import type { Ontology } from "@trustgraph/react-state";

export interface ExportOptions {
  format: "owl" | "rdf" | "turtle";
  includeComments?: boolean;
  includeNamespaces?: boolean;
}

export class OntologyExporter {
  static export(ontology: Ontology, options: ExportOptions): string {
    switch (options.format) {
      case "owl": return this.exportToOWL(ontology, options);
      case "rdf": return this.exportToOWL(ontology, options);
      case "turtle": return this.exportToTurtle(ontology, options);
      default: throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private static exportToOWL(ontology: Ontology, options: ExportOptions): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0"?>');
    lines.push('<rdf:RDF xmlns="' + ontology.metadata.namespace + '"');
    lines.push('     xml:base="' + ontology.metadata.namespace + '"');
    lines.push('     xmlns:owl="http://www.w3.org/2002/07/owl#"');
    lines.push('     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"');
    lines.push('     xmlns:xml="http://www.w3.org/XML/1998/namespace"');
    lines.push('     xmlns:xsd="http://www.w3.org/2001/XMLSchema#"');
    lines.push('     xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">');
    lines.push('    <owl:Ontology rdf:about="' + ontology.metadata.namespace + '">');
    if (ontology.metadata.name) lines.push('        <rdfs:label xml:lang="en">' + this.escapeXML(ontology.metadata.name) + "</rdfs:label>");
    if (ontology.metadata.description && options.includeComments !== false) lines.push('        <rdfs:comment xml:lang="en">' + this.escapeXML(ontology.metadata.description) + "</rdfs:comment>");
    if (ontology.metadata.version) lines.push("        <owl:versionInfo>" + this.escapeXML(ontology.metadata.version) + "</owl:versionInfo>");
    lines.push("    </owl:Ontology>");
    lines.push("");

    Object.entries(ontology.classes).forEach(([, owlClass]) => {
      lines.push('    <owl:Class rdf:about="' + owlClass.uri + '">');
      if (owlClass["rdfs:label"]?.length) {
        owlClass["rdfs:label"].forEach((label) => {
          const langAttr = label.lang ? ` xml:lang="${label.lang}"` : "";
          lines.push("        <rdfs:label" + langAttr + ">" + this.escapeXML(label.value) + "</rdfs:label>");
        });
      }
      if (owlClass["rdfs:comment"] && options.includeComments !== false) lines.push('        <rdfs:comment xml:lang="en">' + this.escapeXML(owlClass["rdfs:comment"]) + "</rdfs:comment>");
      if (owlClass["rdfs:subClassOf"]) {
        const parentClass = ontology.classes[owlClass["rdfs:subClassOf"]];
        if (parentClass) lines.push('        <rdfs:subClassOf rdf:resource="' + parentClass.uri + '"/>');
      }
      lines.push("    </owl:Class>");
      lines.push("");
    });

    Object.entries(ontology.objectProperties).forEach(([, property]) => {
      lines.push('    <owl:ObjectProperty rdf:about="' + property.uri + '">');
      if (property["rdfs:label"]?.length) {
        property["rdfs:label"].forEach((label) => {
          const langAttr = label.lang ? ` xml:lang="${label.lang}"` : "";
          lines.push("        <rdfs:label" + langAttr + ">" + this.escapeXML(label.value) + "</rdfs:label>");
        });
      }
      if (property["rdfs:comment"] && options.includeComments !== false) lines.push('        <rdfs:comment xml:lang="en">' + this.escapeXML(property["rdfs:comment"]) + "</rdfs:comment>");
      if (property["rdfs:domain"]) { const d = ontology.classes[property["rdfs:domain"]]; if (d) lines.push('        <rdfs:domain rdf:resource="' + d.uri + '"/>'); }
      if (property["rdfs:range"]) { const r = ontology.classes[property["rdfs:range"]]; if (r) lines.push('        <rdfs:range rdf:resource="' + r.uri + '"/>'); }
      if (property["owl:inverseOf"]) { const inv = ontology.objectProperties[property["owl:inverseOf"]]; if (inv) lines.push('        <owl:inverseOf rdf:resource="' + inv.uri + '"/>'); }
      if (property["owl:functionalProperty"]) lines.push('        <rdf:type rdf:resource="http://www.w3.org/2002/07/owl#FunctionalProperty"/>');
      if (property["owl:inverseFunctionalProperty"]) lines.push('        <rdf:type rdf:resource="http://www.w3.org/2002/07/owl#InverseFunctionalProperty"/>');
      lines.push("    </owl:ObjectProperty>");
      lines.push("");
    });

    Object.entries(ontology.datatypeProperties).forEach(([, property]) => {
      lines.push('    <owl:DatatypeProperty rdf:about="' + property.uri + '">');
      if (property["rdfs:label"]?.length) {
        property["rdfs:label"].forEach((label) => {
          const langAttr = label.lang ? ` xml:lang="${label.lang}"` : "";
          lines.push("        <rdfs:label" + langAttr + ">" + this.escapeXML(label.value) + "</rdfs:label>");
        });
      }
      if (property["rdfs:comment"] && options.includeComments !== false) lines.push('        <rdfs:comment xml:lang="en">' + this.escapeXML(property["rdfs:comment"]) + "</rdfs:comment>");
      if (property["rdfs:domain"]) { const d = ontology.classes[property["rdfs:domain"]]; if (d) lines.push('        <rdfs:domain rdf:resource="' + d.uri + '"/>'); }
      if (property["rdfs:range"]) lines.push('        <rdfs:range rdf:resource="' + property["rdfs:range"] + '"/>');
      if (property["owl:functionalProperty"]) lines.push('        <rdf:type rdf:resource="http://www.w3.org/2002/07/owl#FunctionalProperty"/>');
      lines.push("    </owl:DatatypeProperty>");
      lines.push("");
    });

    lines.push("</rdf:RDF>");
    return lines.join("\n");
  }

  private static exportToTurtle(ontology: Ontology, options: ExportOptions): string {
    const lines: string[] = [];
    lines.push("@prefix : <" + ontology.metadata.namespace + "> .");
    lines.push("@prefix owl: <http://www.w3.org/2002/07/owl#> .");
    lines.push("@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .");
    lines.push("@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .");
    lines.push("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .");
    lines.push("@base <" + ontology.metadata.namespace + "> .");
    lines.push("");
    lines.push("<" + ontology.metadata.namespace + "> rdf:type owl:Ontology");
    if (ontology.metadata.name) lines.push('    ; rdfs:label "' + this.escapeTurtle(ontology.metadata.name) + '"@en');
    if (ontology.metadata.description && options.includeComments !== false) lines.push('    ; rdfs:comment "' + this.escapeTurtle(ontology.metadata.description) + '"@en');
    if (ontology.metadata.version) lines.push('    ; owl:versionInfo "' + this.escapeTurtle(ontology.metadata.version) + '"');
    lines.push("    .");
    lines.push("");

    Object.entries(ontology.classes).forEach(([classId, owlClass]) => {
      lines.push(":" + classId + " rdf:type owl:Class");
      if (owlClass["rdfs:label"]?.length) {
        owlClass["rdfs:label"].forEach((label) => { lines.push('    ; rdfs:label "' + this.escapeTurtle(label.value) + '"' + (label.lang ? `@${label.lang}` : "")); });
      }
      if (owlClass["rdfs:comment"] && options.includeComments !== false) lines.push('    ; rdfs:comment "' + this.escapeTurtle(owlClass["rdfs:comment"]) + '"@en');
      if (owlClass["rdfs:subClassOf"]) lines.push("    ; rdfs:subClassOf :" + owlClass["rdfs:subClassOf"]);
      lines.push("    .");
      lines.push("");
    });

    Object.entries(ontology.objectProperties).forEach(([propId, property]) => {
      lines.push(":" + propId + " rdf:type owl:ObjectProperty");
      if (property["rdfs:label"]?.length) { property["rdfs:label"].forEach((label) => { lines.push('    ; rdfs:label "' + this.escapeTurtle(label.value) + '"' + (label.lang ? `@${label.lang}` : "")); }); }
      if (property["rdfs:comment"] && options.includeComments !== false) lines.push('    ; rdfs:comment "' + this.escapeTurtle(property["rdfs:comment"]) + '"@en');
      if (property["rdfs:domain"]) lines.push("    ; rdfs:domain :" + property["rdfs:domain"]);
      if (property["rdfs:range"]) lines.push("    ; rdfs:range :" + property["rdfs:range"]);
      lines.push("    .");
      lines.push("");
    });

    Object.entries(ontology.datatypeProperties).forEach(([propId, property]) => {
      lines.push(":" + propId + " rdf:type owl:DatatypeProperty");
      if (property["rdfs:label"]?.length) { property["rdfs:label"].forEach((label) => { lines.push('    ; rdfs:label "' + this.escapeTurtle(label.value) + '"' + (label.lang ? `@${label.lang}` : "")); }); }
      if (property["rdfs:comment"] && options.includeComments !== false) lines.push('    ; rdfs:comment "' + this.escapeTurtle(property["rdfs:comment"]) + '"@en');
      if (property["rdfs:domain"]) lines.push("    ; rdfs:domain :" + property["rdfs:domain"]);
      if (property["rdfs:range"]) { lines.push(property["rdfs:range"].startsWith("xsd:") ? "    ; rdfs:range " + property["rdfs:range"] : "    ; rdfs:range <" + property["rdfs:range"] + ">"); }
      lines.push("    .");
      lines.push("");
    });

    return lines.join("\n");
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
    return format === "turtle" ? ".ttl" : format === "owl" ? ".owl" : ".rdf";
  }

  static getMimeType(format: ExportOptions["format"]): string {
    return format === "turtle" ? "text/turtle" : "application/rdf+xml";
  }
}
