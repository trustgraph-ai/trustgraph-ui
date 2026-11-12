import type { NormalizedOntology, OntologyClass, OntologyProperty, OntologyMetadata } from "@trustgraph/react-state";
import { normalizeJsonLd } from "@trustgraph/react-state";

export interface ImportResult {
  ontology: NormalizedOntology;
  warnings: string[];
}

interface TurtleTriple {
  subject: string;
  predicate: string;
  object: string;
}

export class OntologyImporter {
  static import(content: string, _filename?: string): ImportResult {
    const trimmed = content.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) || parsed["@graph"] || parsed["@id"]) {
          return { ontology: normalizeJsonLd(parsed), warnings: [] };
        }
      } catch {
        // Not valid JSON — fall through to other parsers
      }
    }
    if (trimmed.startsWith("<?xml") || trimmed.startsWith("<rdf:RDF")) {
      return this.importFromOWLXML(trimmed);
    }
    if (trimmed.startsWith("@prefix") || trimmed.startsWith("@base") || trimmed.startsWith("#")) {
      return this.importFromTurtle(trimmed);
    }
    throw new Error("Unrecognized format. Supported formats: JSON-LD (.jsonld), OWL/XML (.owl, .rdf) and Turtle (.ttl).");
  }

  // ── OWL/XML parser ──

  private static importFromOWLXML(xml: string): ImportResult {
    const warnings: string[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");

    const parseError = doc.querySelector("parsererror");
    if (parseError) throw new Error("Invalid XML: " + parseError.textContent?.slice(0, 200));

    const ns = {
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      owl: "http://www.w3.org/2002/07/owl#",
    };

    const rdfRoot = doc.documentElement;
    const baseNamespace = rdfRoot.getAttribute("xmlns") || rdfRoot.getAttributeNS(ns.rdf, "about") || "";

    const metadata: OntologyMetadata = {
      id: baseNamespace, name: "", description: "", version: "",
    };

    const dctermsNs = "http://purl.org/dc/terms/";
    const ontologyEl = doc.getElementsByTagNameNS(ns.owl, "Ontology")[0];
    if (ontologyEl) {
      metadata.name = this.getXMLTextContent(ontologyEl, ns.rdfs, "label") || this.getXMLTextContent(ontologyEl, dctermsNs, "title") || "";
      metadata.description = this.getXMLTextContent(ontologyEl, ns.rdfs, "comment") || this.getXMLTextContent(ontologyEl, dctermsNs, "description") || "";
      metadata.version = this.getXMLTextContent(ontologyEl, ns.owl, "versionInfo") || "";
      const about = ontologyEl.getAttributeNS(ns.rdf, "about");
      if (about) metadata.id = about;
    }

    const classes = new Map<string, OntologyClass>();
    const classElements = doc.getElementsByTagNameNS(ns.owl, "Class");
    for (let i = 0; i < classElements.length; i++) {
      const el = classElements[i];
      const uri = el.getAttributeNS(ns.rdf, "about");
      if (!uri) continue;
      const labels = this.getXMLLabels(el, ns.rdfs);
      const comment = this.getXMLTextContent(el, ns.rdfs, "comment") || undefined;
      const subClassOfEls = el.getElementsByTagNameNS(ns.rdfs, "subClassOf");
      const subClassOf: string[] = [];
      for (let j = 0; j < subClassOfEls.length; j++) {
        const ref = subClassOfEls[j].getAttributeNS(ns.rdf, "resource");
        if (ref) subClassOf.push(ref);
      }
      classes.set(uri, {
        id: uri, labels, comment,
        subClassOf: subClassOf.length > 0 ? subClassOf : undefined,
      });
    }

    const objectProperties = new Map<string, OntologyProperty>();
    const objPropElements = doc.getElementsByTagNameNS(ns.owl, "ObjectProperty");
    for (let i = 0; i < objPropElements.length; i++) {
      const el = objPropElements[i];
      const uri = el.getAttributeNS(ns.rdf, "about");
      if (!uri) continue;
      const labels = this.getXMLLabels(el, ns.rdfs);
      const comment = this.getXMLTextContent(el, ns.rdfs, "comment") || undefined;
      const domain = this.getXMLResourceRef(el, ns.rdfs, "domain");
      const range = this.getXMLResourceRef(el, ns.rdfs, "range");
      const inverseOf = this.getXMLResourceRef(el, ns.owl, "inverseOf");
      const functional = this.hasRdfType(el, ns, "http://www.w3.org/2002/07/owl#FunctionalProperty");
      const inverseFunctional = this.hasRdfType(el, ns, "http://www.w3.org/2002/07/owl#InverseFunctionalProperty");
      objectProperties.set(uri, {
        id: uri, propertyType: "object", labels, comment,
        domain, range,
        inverseOf: inverseOf || undefined,
        functional: functional || undefined,
        inverseFunctional: inverseFunctional || undefined,
      });
    }

    const datatypeProperties = new Map<string, OntologyProperty>();
    const dtPropElements = doc.getElementsByTagNameNS(ns.owl, "DatatypeProperty");
    for (let i = 0; i < dtPropElements.length; i++) {
      const el = dtPropElements[i];
      const uri = el.getAttributeNS(ns.rdf, "about");
      if (!uri) continue;
      const labels = this.getXMLLabels(el, ns.rdfs);
      const comment = this.getXMLTextContent(el, ns.rdfs, "comment") || undefined;
      const domain = this.getXMLResourceRef(el, ns.rdfs, "domain");
      const rangeEl = el.getElementsByTagNameNS(ns.rdfs, "range")[0];
      const range = rangeEl?.getAttributeNS(ns.rdf, "resource") || undefined;
      datatypeProperties.set(uri, {
        id: uri, propertyType: "datatype", labels, comment,
        domain, range,
        functional: this.hasRdfType(el, ns, "http://www.w3.org/2002/07/owl#FunctionalProperty") || undefined,
      });
    }

    if (!metadata.name && classes.size === 0) warnings.push("No ontology name or classes found \u2014 file may be empty or in an unsupported dialect.");
    return { ontology: { metadata, classes, objectProperties, datatypeProperties, otherNodes: [] }, warnings };
  }

  // ── Turtle parser ──

  private static importFromTurtle(ttl: string): ImportResult {
    const warnings: string[] = [];
    const prefixes: Record<string, string> = {};
    let baseUri = "";

    for (const line of ttl.split("\n")) {
      const trimmed = line.trim();
      const prefixMatch = trimmed.match(/^@prefix\s+(\S*)\s+<([^>]+)>\s*\./);
      if (prefixMatch) { prefixes[prefixMatch[1]] = prefixMatch[2]; continue; }
      const baseMatch = trimmed.match(/^@base\s+<([^>]+)>\s*\./);
      if (baseMatch) { baseUri = baseMatch[1]; }
    }

    const resolve = (term: string): string => {
      if (term.startsWith("<") && term.endsWith(">")) return term.slice(1, -1);
      const colonIdx = term.indexOf(":");
      if (colonIdx !== -1) {
        const prefix = term.slice(0, colonIdx + 1);
        const local = term.slice(colonIdx + 1);
        if (prefixes[prefix] !== undefined) return prefixes[prefix] + local;
      }
      return term;
    };

    const triples = this.tokenizeTurtle(ttl, resolve);
    const defaultNs = prefixes[":"] || baseUri || "";

    const metadata: OntologyMetadata = {
      id: defaultNs, name: "", description: "", version: "",
    };

    const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    const OWL_CLASS = "http://www.w3.org/2002/07/owl#Class";
    const OWL_OBJPROP = "http://www.w3.org/2002/07/owl#ObjectProperty";
    const OWL_DTPROP = "http://www.w3.org/2002/07/owl#DatatypeProperty";
    const OWL_ONTOLOGY = "http://www.w3.org/2002/07/owl#Ontology";
    const OWL_FUNCPROP = "http://www.w3.org/2002/07/owl#FunctionalProperty";
    const OWL_INVFUNCPROP = "http://www.w3.org/2002/07/owl#InverseFunctionalProperty";
    const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
    const RDFS_COMMENT = "http://www.w3.org/2000/01/rdf-schema#comment";
    const RDFS_SUBCLASSOF = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
    const RDFS_DOMAIN = "http://www.w3.org/2000/01/rdf-schema#domain";
    const RDFS_RANGE = "http://www.w3.org/2000/01/rdf-schema#range";
    const OWL_INVERSEOF = "http://www.w3.org/2002/07/owl#inverseOf";
    const OWL_VERSIONINFO = "http://www.w3.org/2002/07/owl#versionInfo";
    const DCTERMS_TITLE = "http://purl.org/dc/terms/title";
    const DCTERMS_DESCRIPTION = "http://purl.org/dc/terms/description";
    const bySubject = new Map<string, TurtleTriple[]>();
    for (const t of triples) {
      if (!bySubject.has(t.subject)) bySubject.set(t.subject, []);
      bySubject.get(t.subject)!.push(t);
    }

    const classes = new Map<string, OntologyClass>();
    const objectProperties = new Map<string, OntologyProperty>();
    const datatypeProperties = new Map<string, OntologyProperty>();

    for (const [subject, subjectTriples] of bySubject) {
      const types = subjectTriples.filter((t) => t.predicate === RDF_TYPE).map((t) => t.object);
      const get = (pred: string) => subjectTriples.filter((t) => t.predicate === pred).map((t) => t.object);
      const getFirst = (pred: string) => get(pred)[0] || undefined;
      const getLabels = (pred: string) => get(pred).map((v) => this.parseTurtleLiteralWithLang(v));

      if (types.includes(OWL_ONTOLOGY)) {
        const name = this.extractLiteralValue(getFirst(RDFS_LABEL)) || this.extractLiteralValue(getFirst(DCTERMS_TITLE)) || "";
        const description = this.extractLiteralValue(getFirst(RDFS_COMMENT)) || this.extractLiteralValue(getFirst(DCTERMS_DESCRIPTION)) || "";
        const version = this.extractLiteralValue(getFirst(OWL_VERSIONINFO)) || "";
        if (!metadata.name || (!metadata.name && name)) {
          metadata.name = name;
          metadata.description = description;
          metadata.version = version;
          metadata.id = subject;
        }
        continue;
      }

      if (types.includes(OWL_CLASS)) {
        const labels = getLabels(RDFS_LABEL);
        const comment = this.extractLiteralValue(getFirst(RDFS_COMMENT)) || undefined;
        const subClassOfUris = get(RDFS_SUBCLASSOF);
        classes.set(subject, {
          id: subject, labels, comment,
          subClassOf: subClassOfUris.length > 0 ? subClassOfUris : undefined,
        });
      } else if (types.includes(OWL_OBJPROP)) {
        const labels = getLabels(RDFS_LABEL);
        const comment = this.extractLiteralValue(getFirst(RDFS_COMMENT)) || undefined;
        objectProperties.set(subject, {
          id: subject, propertyType: "object", labels, comment,
          domain: getFirst(RDFS_DOMAIN),
          range: getFirst(RDFS_RANGE),
          inverseOf: getFirst(OWL_INVERSEOF) || undefined,
          functional: types.includes(OWL_FUNCPROP) || undefined,
          inverseFunctional: types.includes(OWL_INVFUNCPROP) || undefined,
        });
      } else if (types.includes(OWL_DTPROP)) {
        const labels = getLabels(RDFS_LABEL);
        const comment = this.extractLiteralValue(getFirst(RDFS_COMMENT)) || undefined;
        datatypeProperties.set(subject, {
          id: subject, propertyType: "datatype", labels, comment,
          domain: getFirst(RDFS_DOMAIN),
          range: getFirst(RDFS_RANGE),
          functional: types.includes(OWL_FUNCPROP) || undefined,
        });
      }
    }

    if (!metadata.name && classes.size === 0) warnings.push("No ontology name or classes found.");
    return { ontology: { metadata, classes, objectProperties, datatypeProperties, otherNodes: [] }, warnings };
  }

  private static tokenizeTurtle(ttl: string, resolve: (t: string) => string): TurtleTriple[] {
    const triples: TurtleTriple[] = [];
    const tokens = this.turtleTokenize(ttl);

    let subject = "";
    let predicate = "";
    let expectSubject = true;
    let expectPredicate = false;
    let expectObject = false;

    for (const token of tokens) {
      if (token === "@prefix" || token === "@base") {
        expectSubject = false;
        expectPredicate = false;
        expectObject = false;
        continue;
      }

      if (token === ".") {
        subject = "";
        predicate = "";
        expectSubject = true;
        expectPredicate = false;
        expectObject = false;
        continue;
      }

      if (token === ";") {
        expectPredicate = true;
        expectObject = false;
        continue;
      }

      if (token === ",") {
        expectObject = true;
        continue;
      }

      if (expectSubject) {
        subject = this.resolveToken(token, resolve);
        expectSubject = false;
        expectPredicate = true;
        continue;
      }

      if (expectPredicate) {
        if (token === "a") {
          predicate = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
        } else {
          predicate = this.resolveToken(token, resolve);
        }
        expectPredicate = false;
        expectObject = true;
        continue;
      }

      if (expectObject) {
        if (!subject || !predicate) continue;
        const object = token.startsWith('"') ? token : this.resolveToken(token, resolve);
        triples.push({ subject, predicate, object });
        expectObject = false;
        continue;
      }
    }

    return triples;
  }

  private static turtleTokenize(ttl: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    const len = ttl.length;

    while (i < len) {
      if (/\s/.test(ttl[i])) { i++; continue; }

      if (ttl[i] === "#") {
        while (i < len && ttl[i] !== "\n") i++;
        continue;
      }

      if (ttl[i] === "." && (i + 1 >= len || /[\s#]/.test(ttl[i + 1]))) {
        tokens.push(".");
        i++;
        continue;
      }
      if (ttl[i] === ";") { tokens.push(";"); i++; continue; }
      if (ttl[i] === ",") { tokens.push(","); i++; continue; }

      if (ttl[i] === '"' && i + 2 < len && ttl[i + 1] === '"' && ttl[i + 2] === '"') {
        let j = i + 3;
        while (j < len) {
          if (ttl[j] === "\\" && j + 1 < len) { j += 2; continue; }
          if (ttl[j] === '"' && j + 2 < len && ttl[j + 1] === '"' && ttl[j + 2] === '"') { j += 3; break; }
          j++;
        }
        while (j < len && (ttl[j] === "@" || ttl[j] === "^")) {
          if (ttl[j] === "@") { j++; while (j < len && /[a-zA-Z0-9-]/.test(ttl[j])) j++; }
          else if (ttl[j] === "^" && j + 1 < len && ttl[j + 1] === "^") { j += 2; if (ttl[j] === "<") { while (j < len && ttl[j] !== ">") j++; j++; } else { while (j < len && /\S/.test(ttl[j]) && ttl[j] !== ";" && ttl[j] !== "," && ttl[j] !== ".") j++; } }
          else break;
        }
        tokens.push(ttl.slice(i, j));
        i = j;
        continue;
      }

      if (ttl[i] === '"') {
        let j = i + 1;
        while (j < len) {
          if (ttl[j] === "\\" && j + 1 < len) { j += 2; continue; }
          if (ttl[j] === '"') { j++; break; }
          j++;
        }
        while (j < len && (ttl[j] === "@" || ttl[j] === "^")) {
          if (ttl[j] === "@") { j++; while (j < len && /[a-zA-Z0-9-]/.test(ttl[j])) j++; }
          else if (ttl[j] === "^" && j + 1 < len && ttl[j + 1] === "^") { j += 2; if (ttl[j] === "<") { while (j < len && ttl[j] !== ">") j++; j++; } else { while (j < len && /\S/.test(ttl[j]) && ttl[j] !== ";" && ttl[j] !== "," && ttl[j] !== ".") j++; } }
          else break;
        }
        tokens.push(ttl.slice(i, j));
        i = j;
        continue;
      }

      if (ttl[i] === "<") {
        let j = i + 1;
        while (j < len && ttl[j] !== ">") j++;
        j++;
        tokens.push(ttl.slice(i, j));
        i = j;
        continue;
      }

      if (ttl[i] === "[") {
        let depth = 1;
        let j = i + 1;
        while (j < len && depth > 0) {
          if (ttl[j] === "[") depth++;
          else if (ttl[j] === "]") depth--;
          else if (ttl[j] === '"') {
            j++;
            while (j < len && ttl[j] !== '"') { if (ttl[j] === "\\") j++; j++; }
          }
          j++;
        }
        i = j;
        continue;
      }

      if (ttl[i] === "(") {
        let depth = 1;
        let j = i + 1;
        while (j < len && depth > 0) {
          if (ttl[j] === "(") depth++;
          else if (ttl[j] === ")") depth--;
          j++;
        }
        i = j;
        continue;
      }

      if (ttl[i] === "@") {
        let j = i;
        while (j < len) {
          if (ttl[j] === "<") { while (j < len && ttl[j] !== ">") j++; j++; continue; }
          if (ttl[j] === "." && (j + 1 >= len || /[\s#]/.test(ttl[j + 1]))) { j++; break; }
          j++;
        }
        const directive = ttl.slice(i, j).trim();
        if (directive.startsWith("@prefix") || directive.startsWith("@base")) {
          tokens.push(directive.startsWith("@prefix") ? "@prefix" : "@base");
          i = j;
          tokens.push(".");
          continue;
        }
        i = j;
        continue;
      }

      let j = i;
      while (j < len && /\S/.test(ttl[j]) && ttl[j] !== ";" && ttl[j] !== "," && ttl[j] !== "." && ttl[j] !== '"' && ttl[j] !== "<" && ttl[j] !== "[" && ttl[j] !== "(" && ttl[j] !== "#") j++;
      if (j > i) {
        const word = ttl.slice(i, j);
        if (word.endsWith(".")) {
          tokens.push(word.slice(0, -1));
          tokens.push(".");
        } else {
          tokens.push(word);
        }
        i = j;
      } else {
        i++;
      }
    }

    return tokens;
  }

  private static resolveToken(token: string, resolve: (t: string) => string): string {
    if (token.startsWith("<") && token.endsWith(">")) return token.slice(1, -1);
    return resolve(token);
  }

  private static extractLiteralValue(raw: string | undefined): string | null {
    if (!raw) return null;
    const tripleMatch = raw.match(/^"""([\s\S]*?)"""/);
    if (tripleMatch) return this.unescapeTurtle(tripleMatch[1]);
    const singleMatch = raw.match(/^"((?:[^"\\]|\\.)*)"/);
    if (singleMatch) return this.unescapeTurtle(singleMatch[1]);
    return null;
  }

  private static parseTurtleLiteralWithLang(raw: string): { value: string; lang?: string } {
    const tripleMatch = raw.match(/^"""([\s\S]*?)"""(?:@(\w[\w-]*))?/);
    if (tripleMatch) {
      const val = this.unescapeTurtle(tripleMatch[1]);
      return tripleMatch[2] ? { value: val, lang: tripleMatch[2] } : { value: val };
    }
    const singleMatch = raw.match(/^"((?:[^"\\]|\\.)*)"(?:@(\w[\w-]*))?/);
    if (singleMatch) {
      const val = this.unescapeTurtle(singleMatch[1]);
      return singleMatch[2] ? { value: val, lang: singleMatch[2] } : { value: val };
    }
    return { value: raw };
  }

  private static unescapeTurtle(s: string): string {
    return s.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\\\/g, "\\");
  }

  private static getXMLTextContent(parent: Element, nsUri: string, localName: string): string | null {
    const el = parent.getElementsByTagNameNS(nsUri, localName)[0];
    return el?.textContent || null;
  }

  private static getXMLLabels(parent: Element, rdfsNs: string): Array<{ value: string; lang?: string }> {
    const labels: Array<{ value: string; lang?: string }> = [];
    const els = parent.getElementsByTagNameNS(rdfsNs, "label");
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const text = el.textContent || "";
      const lang = el.getAttributeNS("http://www.w3.org/XML/1998/namespace", "lang") || undefined;
      labels.push({ value: text, lang });
    }
    return labels;
  }

  private static getXMLResourceRef(parent: Element, nsUri: string, localName: string): string | undefined {
    const el = parent.getElementsByTagNameNS(nsUri, localName)[0];
    return el?.getAttributeNS("http://www.w3.org/1999/02/22-rdf-syntax-ns#", "resource") || undefined;
  }

  private static hasRdfType(el: Element, ns: { rdf: string }, typeUri: string): boolean {
    const typeEls = el.getElementsByTagNameNS(ns.rdf, "type");
    for (let i = 0; i < typeEls.length; i++) {
      if (typeEls[i].getAttributeNS(ns.rdf, "resource") === typeUri) return true;
    }
    return false;
  }
}
