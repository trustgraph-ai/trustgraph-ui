import type { Ontology, OntologyMetadata, OWLClass, OWLObjectProperty, OWLDatatypeProperty } from "@trustgraph/react-state";

export interface ImportResult {
  ontology: Ontology;
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
    if (trimmed.startsWith("<?xml") || trimmed.startsWith("<rdf:RDF")) {
      return this.importFromOWLXML(trimmed);
    }
    if (trimmed.startsWith("@prefix") || trimmed.startsWith("@base") || trimmed.startsWith("#")) {
      return this.importFromTurtle(trimmed);
    }
    throw new Error("Unrecognized format. Supported formats: OWL/XML (.owl, .rdf) and Turtle (.ttl).");
  }

  // ── OWL/XML parser (unchanged) ──

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
      name: "", description: "", version: "", created: new Date().toISOString(),
      modified: new Date().toISOString(), creator: "", namespace: baseNamespace,
    };

    const dctermsNs = "http://purl.org/dc/terms/";
    const ontologyEl = doc.getElementsByTagNameNS(ns.owl, "Ontology")[0];
    if (ontologyEl) {
      metadata.name = this.getXMLTextContent(ontologyEl, ns.rdfs, "label") || this.getXMLTextContent(ontologyEl, dctermsNs, "title") || "";
      metadata.description = this.getXMLTextContent(ontologyEl, ns.rdfs, "comment") || this.getXMLTextContent(ontologyEl, dctermsNs, "description") || "";
      metadata.version = this.getXMLTextContent(ontologyEl, ns.owl, "versionInfo") || "";
      const about = ontologyEl.getAttributeNS(ns.rdf, "about");
      if (about) metadata.namespace = about;
    }

    const classes: Record<string, OWLClass> = {};
    const classElements = doc.getElementsByTagNameNS(ns.owl, "Class");
    for (let i = 0; i < classElements.length; i++) {
      const el = classElements[i];
      const uri = el.getAttributeNS(ns.rdf, "about");
      if (!uri) continue;
      const id = this.localName(uri, metadata.namespace);
      const labels = this.getXMLLabels(el, ns.rdfs);
      const comment = this.getXMLTextContent(el, ns.rdfs, "comment") || undefined;
      const subClassOfEl = el.getElementsByTagNameNS(ns.rdfs, "subClassOf")[0];
      const subClassOfUri = subClassOfEl?.getAttributeNS(ns.rdf, "resource");
      const subClassOf = subClassOfUri ? this.localName(subClassOfUri, metadata.namespace) : undefined;
      classes[id] = { uri, type: "owl:Class", "rdfs:label": labels.length > 0 ? labels : undefined, "rdfs:comment": comment, "rdfs:subClassOf": subClassOf };
    }

    const objectProperties: Record<string, OWLObjectProperty> = {};
    const objPropElements = doc.getElementsByTagNameNS(ns.owl, "ObjectProperty");
    for (let i = 0; i < objPropElements.length; i++) {
      const el = objPropElements[i];
      const uri = el.getAttributeNS(ns.rdf, "about");
      if (!uri) continue;
      const id = this.localName(uri, metadata.namespace);
      const labels = this.getXMLLabels(el, ns.rdfs);
      const comment = this.getXMLTextContent(el, ns.rdfs, "comment") || undefined;
      const domain = this.getXMLResourceRef(el, ns.rdfs, "domain", metadata.namespace);
      const range = this.getXMLResourceRef(el, ns.rdfs, "range", metadata.namespace);
      const inverseOf = this.getXMLResourceRef(el, ns.owl, "inverseOf", metadata.namespace);
      const functional = this.hasRdfType(el, ns, "http://www.w3.org/2002/07/owl#FunctionalProperty");
      const inverseFunctional = this.hasRdfType(el, ns, "http://www.w3.org/2002/07/owl#InverseFunctionalProperty");
      objectProperties[id] = {
        uri, type: "owl:ObjectProperty",
        "rdfs:label": labels.length > 0 ? labels : undefined, "rdfs:comment": comment,
        "rdfs:domain": domain, "rdfs:range": range,
        "owl:inverseOf": inverseOf || undefined,
        "owl:functionalProperty": functional || undefined,
        "owl:inverseFunctionalProperty": inverseFunctional || undefined,
      };
    }

    const datatypeProperties: Record<string, OWLDatatypeProperty> = {};
    const dtPropElements = doc.getElementsByTagNameNS(ns.owl, "DatatypeProperty");
    for (let i = 0; i < dtPropElements.length; i++) {
      const el = dtPropElements[i];
      const uri = el.getAttributeNS(ns.rdf, "about");
      if (!uri) continue;
      const id = this.localName(uri, metadata.namespace);
      const labels = this.getXMLLabels(el, ns.rdfs);
      const comment = this.getXMLTextContent(el, ns.rdfs, "comment") || undefined;
      const domain = this.getXMLResourceRef(el, ns.rdfs, "domain", metadata.namespace);
      const rangeEl = el.getElementsByTagNameNS(ns.rdfs, "range")[0];
      const rangeUri = rangeEl?.getAttributeNS(ns.rdf, "resource");
      datatypeProperties[id] = {
        uri, type: "owl:DatatypeProperty",
        "rdfs:label": labels.length > 0 ? labels : undefined, "rdfs:comment": comment,
        "rdfs:domain": domain, "rdfs:range": rangeUri || undefined,
        "owl:functionalProperty": this.hasRdfType(el, ns, "http://www.w3.org/2002/07/owl#FunctionalProperty") || undefined,
      };
    }

    if (!metadata.name && Object.keys(classes).length === 0) warnings.push("No ontology name or classes found — file may be empty or in an unsupported dialect.");
    return { ontology: { metadata, classes, objectProperties, datatypeProperties }, warnings };
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
      name: "", description: "", version: "", created: new Date().toISOString(),
      modified: new Date().toISOString(), creator: "", namespace: defaultNs,
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
    const DCTERMS_CREATED = "http://purl.org/dc/terms/created";

    // Group triples by subject
    const bySubject = new Map<string, TurtleTriple[]>();
    for (const t of triples) {
      if (!bySubject.has(t.subject)) bySubject.set(t.subject, []);
      bySubject.get(t.subject)!.push(t);
    }

    const classes: Record<string, OWLClass> = {};
    const objectProperties: Record<string, OWLObjectProperty> = {};
    const datatypeProperties: Record<string, OWLDatatypeProperty> = {};

    for (const [subject, subjectTriples] of bySubject) {
      const types = subjectTriples.filter((t) => t.predicate === RDF_TYPE).map((t) => t.object);
      const get = (pred: string) => subjectTriples.filter((t) => t.predicate === pred).map((t) => t.object);
      const getFirst = (pred: string) => get(pred)[0] || undefined;
      const getLabels = (pred: string) => get(pred).map((v) => this.parseTurtleLiteralWithLang(v));

      if (types.includes(OWL_ONTOLOGY)) {
        const name = this.extractLiteralValue(getFirst(RDFS_LABEL)) || this.extractLiteralValue(getFirst(DCTERMS_TITLE)) || "";
        const description = this.extractLiteralValue(getFirst(RDFS_COMMENT)) || this.extractLiteralValue(getFirst(DCTERMS_DESCRIPTION)) || "";
        const version = this.extractLiteralValue(getFirst(OWL_VERSIONINFO)) || "";
        const created = this.extractLiteralValue(getFirst(DCTERMS_CREATED)) || "";
        // For multi-ontology files, prefer the first one with a title
        if (!metadata.name || (!metadata.name && name)) {
          metadata.name = name;
          metadata.description = description;
          metadata.version = version;
          metadata.namespace = subject;
          if (created) metadata.created = created;
        }
        continue;
      }

      const id = this.localName(subject, metadata.namespace || defaultNs);

      if (types.includes(OWL_CLASS)) {
        const labels = getLabels(RDFS_LABEL);
        const comment = this.extractLiteralValue(getFirst(RDFS_COMMENT));
        const subClassOfUri = getFirst(RDFS_SUBCLASSOF);
        const subClassOf = subClassOfUri ? this.localName(subClassOfUri, metadata.namespace || defaultNs) : undefined;
        classes[id] = { uri: subject, type: "owl:Class", "rdfs:label": labels.length > 0 ? labels : undefined, "rdfs:comment": comment || undefined, "rdfs:subClassOf": subClassOf };
      } else if (types.includes(OWL_OBJPROP)) {
        const labels = getLabels(RDFS_LABEL);
        const comment = this.extractLiteralValue(getFirst(RDFS_COMMENT));
        const domainUri = getFirst(RDFS_DOMAIN);
        const rangeUri = getFirst(RDFS_RANGE);
        const inverseOfUri = getFirst(OWL_INVERSEOF);
        objectProperties[id] = {
          uri: subject, type: "owl:ObjectProperty",
          "rdfs:label": labels.length > 0 ? labels : undefined, "rdfs:comment": comment || undefined,
          "rdfs:domain": domainUri ? this.localName(domainUri, metadata.namespace || defaultNs) : undefined,
          "rdfs:range": rangeUri ? this.localName(rangeUri, metadata.namespace || defaultNs) : undefined,
          "owl:inverseOf": inverseOfUri ? this.localName(inverseOfUri, metadata.namespace || defaultNs) : undefined,
          "owl:functionalProperty": types.includes(OWL_FUNCPROP) || undefined,
          "owl:inverseFunctionalProperty": types.includes(OWL_INVFUNCPROP) || undefined,
        };
      } else if (types.includes(OWL_DTPROP)) {
        const labels = getLabels(RDFS_LABEL);
        const comment = this.extractLiteralValue(getFirst(RDFS_COMMENT));
        const domainUri = getFirst(RDFS_DOMAIN);
        const rangeUri = getFirst(RDFS_RANGE);
        datatypeProperties[id] = {
          uri: subject, type: "owl:DatatypeProperty",
          "rdfs:label": labels.length > 0 ? labels : undefined, "rdfs:comment": comment || undefined,
          "rdfs:domain": domainUri ? this.localName(domainUri, metadata.namespace || defaultNs) : undefined,
          "rdfs:range": rangeUri || undefined,
          "owl:functionalProperty": types.includes(OWL_FUNCPROP) || undefined,
        };
      }
      // Silently skip other types (owl:NamedIndividual, owl:AnnotationProperty, etc.)
    }

    if (!metadata.name && Object.keys(classes).length === 0) warnings.push("No ontology name or classes found.");
    return { ontology: { metadata, classes, objectProperties, datatypeProperties }, warnings };
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
        // Skip directive tokens until '.'
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
      // Skip whitespace
      if (/\s/.test(ttl[i])) { i++; continue; }

      // Comment
      if (ttl[i] === "#") {
        while (i < len && ttl[i] !== "\n") i++;
        continue;
      }

      // Punctuation: . ; ,
      if (ttl[i] === "." && (i + 1 >= len || /[\s#]/.test(ttl[i + 1]))) {
        tokens.push(".");
        i++;
        continue;
      }
      if (ttl[i] === ";") { tokens.push(";"); i++; continue; }
      if (ttl[i] === ",") { tokens.push(","); i++; continue; }

      // Triple-quoted string """..."""
      if (ttl[i] === '"' && i + 2 < len && ttl[i + 1] === '"' && ttl[i + 2] === '"') {
        let j = i + 3;
        while (j < len) {
          if (ttl[j] === "\\" && j + 1 < len) { j += 2; continue; }
          if (ttl[j] === '"' && j + 2 < len && ttl[j + 1] === '"' && ttl[j + 2] === '"') { j += 3; break; }
          j++;
        }
        // Consume optional lang tag or datatype
        while (j < len && (ttl[j] === "@" || ttl[j] === "^")) {
          if (ttl[j] === "@") { j++; while (j < len && /[a-zA-Z0-9-]/.test(ttl[j])) j++; }
          else if (ttl[j] === "^" && j + 1 < len && ttl[j + 1] === "^") { j += 2; if (ttl[j] === "<") { while (j < len && ttl[j] !== ">") j++; j++; } else { while (j < len && /\S/.test(ttl[j]) && ttl[j] !== ";" && ttl[j] !== "," && ttl[j] !== ".") j++; } }
          else break;
        }
        tokens.push(ttl.slice(i, j));
        i = j;
        continue;
      }

      // Single-quoted string "..."
      if (ttl[i] === '"') {
        let j = i + 1;
        while (j < len) {
          if (ttl[j] === "\\" && j + 1 < len) { j += 2; continue; }
          if (ttl[j] === '"') { j++; break; }
          j++;
        }
        // Consume optional lang tag or datatype
        while (j < len && (ttl[j] === "@" || ttl[j] === "^")) {
          if (ttl[j] === "@") { j++; while (j < len && /[a-zA-Z0-9-]/.test(ttl[j])) j++; }
          else if (ttl[j] === "^" && j + 1 < len && ttl[j + 1] === "^") { j += 2; if (ttl[j] === "<") { while (j < len && ttl[j] !== ">") j++; j++; } else { while (j < len && /\S/.test(ttl[j]) && ttl[j] !== ";" && ttl[j] !== "," && ttl[j] !== ".") j++; } }
          else break;
        }
        tokens.push(ttl.slice(i, j));
        i = j;
        continue;
      }

      // IRI <...>
      if (ttl[i] === "<") {
        let j = i + 1;
        while (j < len && ttl[j] !== ">") j++;
        j++;
        tokens.push(ttl.slice(i, j));
        i = j;
        continue;
      }

      // Blank node [...]  — skip entirely
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

      // Collection (...)  — skip entirely
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

      // @prefix / @base directives — consume whole directive
      if (ttl[i] === "@") {
        let j = i;
        while (j < len) {
          if (ttl[j] === "<") { while (j < len && ttl[j] !== ">") j++; j++; continue; }
          if (ttl[j] === "." && (j + 1 >= len || /[\s#]/.test(ttl[j + 1]))) { j++; break; }
          j++;
        }
        // push directive marker so state machine can skip
        const directive = ttl.slice(i, j).trim();
        if (directive.startsWith("@prefix") || directive.startsWith("@base")) {
          tokens.push(directive.startsWith("@prefix") ? "@prefix" : "@base");
          // skip to after the '.'
          i = j;
          // push a '.' to reset state
          tokens.push(".");
          continue;
        }
        i = j;
        continue;
      }

      // Word token (prefixed name, keyword, etc.)
      let j = i;
      while (j < len && /\S/.test(ttl[j]) && ttl[j] !== ";" && ttl[j] !== "," && ttl[j] !== "." && ttl[j] !== '"' && ttl[j] !== "<" && ttl[j] !== "[" && ttl[j] !== "(" && ttl[j] !== "#") j++;
      if (j > i) {
        const word = ttl.slice(i, j);
        // Handle '.' at end of word (e.g., "owl:Class.")
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
    // Triple-quoted
    const tripleMatch = raw.match(/^"""([\s\S]*?)"""/);
    if (tripleMatch) return this.unescapeTurtle(tripleMatch[1]);
    // Single-quoted
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

  // ── XML helpers (unchanged) ──

  private static localName(uri: string, namespace: string): string {
    if (namespace && uri.startsWith(namespace)) return uri.slice(namespace.length);
    const hashIdx = uri.lastIndexOf("#");
    if (hashIdx !== -1) return uri.slice(hashIdx + 1);
    const slashIdx = uri.lastIndexOf("/");
    if (slashIdx !== -1) return uri.slice(slashIdx + 1);
    return uri;
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

  private static getXMLResourceRef(parent: Element, nsUri: string, localName: string, namespace: string): string | undefined {
    const el = parent.getElementsByTagNameNS(nsUri, localName)[0];
    const resource = el?.getAttributeNS("http://www.w3.org/1999/02/22-rdf-syntax-ns#", "resource");
    return resource ? this.localName(resource, namespace) : undefined;
  }

  private static hasRdfType(el: Element, ns: { rdf: string }, typeUri: string): boolean {
    const typeEls = el.getElementsByTagNameNS(ns.rdf, "type");
    for (let i = 0; i < typeEls.length; i++) {
      if (typeEls[i].getAttributeNS(ns.rdf, "resource") === typeUri) return true;
    }
    return false;
  }
}
