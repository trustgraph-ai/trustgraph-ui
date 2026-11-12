
// Well-known namespace URIs
const OWL = "http://www.w3.org/2002/07/owl#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const DCTERMS = "http://purl.org/dc/terms/";

export { OWL, RDFS, DCTERMS };

export interface LangString {
  value: string;
  lang?: string;
}

export interface JsonLdNode {
  "@id": string;
  "@type"?: string[];
  [predicate: string]: unknown;
}

export interface OntologyMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
}

export interface OntologyClass {
  id: string;
  labels: LangString[];
  comment?: string;
  subClassOf?: string[];
  equivalentClass?: string[];
  disjointWith?: string[];
}

export interface OntologyProperty {
  id: string;
  propertyType: "object" | "datatype";
  labels: LangString[];
  comment?: string;
  domain?: string;
  range?: string;
  functional?: boolean;
  inverseFunctional?: boolean;
  inverseOf?: string;
  subPropertyOf?: string;
}

export interface NormalizedOntology {
  metadata: OntologyMetadata;
  classes: Map<string, OntologyClass>;
  objectProperties: Map<string, OntologyProperty>;
  datatypeProperties: Map<string, OntologyProperty>;
  otherNodes: JsonLdNode[];
}

// ── Public API ──

export function normalizeJsonLd(input: unknown): NormalizedOntology {
  const nodes = extractNodes(input);

  const metadata: OntologyMetadata = {
    id: "",
    name: "",
    description: "",
    version: "",
  };
  const classes = new Map<string, OntologyClass>();
  const objectProperties = new Map<string, OntologyProperty>();
  const datatypeProperties = new Map<string, OntologyProperty>();
  const otherNodes: JsonLdNode[] = [];

  for (const node of nodes) {
    const types = node["@type"] || [];

    if (types.includes(OWL + "Ontology")) {
      metadata.id = node["@id"];
      metadata.name =
        getFirstLiteralValue(node, DCTERMS + "title") ||
        getFirstLiteralValue(node, RDFS + "label") ||
        "";
      metadata.description =
        getFirstLiteralValue(node, RDFS + "comment") ||
        getFirstLiteralValue(node, DCTERMS + "description") ||
        "";
      metadata.version =
        getFirstLiteralValue(node, OWL + "versionInfo") || "";
    } else if (types.includes(OWL + "Class")) {
      const cls = normalizeClass(node);
      classes.set(cls.id, cls);
    } else if (types.includes(OWL + "ObjectProperty")) {
      const prop = normalizeProperty(node, "object");
      objectProperties.set(prop.id, prop);
    } else if (types.includes(OWL + "DatatypeProperty")) {
      const prop = normalizeProperty(node, "datatype");
      datatypeProperties.set(prop.id, prop);
    } else {
      otherNodes.push(node);
    }
  }

  return { metadata, classes, objectProperties, datatypeProperties, otherNodes };
}

export function denormalizeToJsonLd(
  ontology: NormalizedOntology,
): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];

  if (ontology.metadata.id) {
    const metaNode: Record<string, unknown> = {
      "@id": ontology.metadata.id,
      "@type": [OWL + "Ontology"],
    };
    if (ontology.metadata.name) {
      metaNode[DCTERMS + "title"] = [{ "@value": ontology.metadata.name }];
    }
    if (ontology.metadata.description) {
      metaNode[RDFS + "comment"] = [
        { "@language": "en", "@value": ontology.metadata.description },
      ];
    }
    if (ontology.metadata.version) {
      metaNode[OWL + "versionInfo"] = [
        { "@value": ontology.metadata.version },
      ];
    }
    nodes.push(metaNode as JsonLdNode);
  }

  for (const cls of ontology.classes.values()) {
    nodes.push(denormalizeClass(cls));
  }
  for (const prop of ontology.objectProperties.values()) {
    nodes.push(denormalizeProperty(prop));
  }
  for (const prop of ontology.datatypeProperties.values()) {
    nodes.push(denormalizeProperty(prop));
  }

  nodes.push(...ontology.otherNodes);

  return nodes;
}

export function createEmptyOntology(
  metadata?: Partial<OntologyMetadata>,
): NormalizedOntology {
  return {
    metadata: {
      id: metadata?.id || "",
      name: metadata?.name || "",
      description: metadata?.description || "",
      version: metadata?.version || "1.0.0",
    },
    classes: new Map(),
    objectProperties: new Map(),
    datatypeProperties: new Map(),
    otherNodes: [],
  };
}

export function getLocalName(uri: string): string {
  const hashIdx = uri.lastIndexOf("#");
  if (hashIdx !== -1) return uri.slice(hashIdx + 1);
  const slashIdx = uri.lastIndexOf("/");
  if (slashIdx !== -1) return uri.slice(slashIdx + 1);
  return uri;
}

export function getNamespace(uri: string): string {
  const hashIdx = uri.lastIndexOf("#");
  if (hashIdx !== -1) return uri.slice(0, hashIdx + 1);
  const slashIdx = uri.lastIndexOf("/");
  if (slashIdx !== -1) return uri.slice(0, slashIdx + 1);
  return uri;
}

export function getLabel(
  resource: { labels: LangString[] },
  preferredLang?: string,
): string {
  if (resource.labels.length === 0) return "";
  if (preferredLang) {
    const match = resource.labels.find((l) => l.lang === preferredLang);
    if (match) return match.value;
  }
  return resource.labels[0].value;
}

// ── Node extraction (handles both expanded and compacted JSON-LD) ──

function extractNodes(input: unknown): JsonLdNode[] {
  if (Array.isArray(input)) {
    return input as JsonLdNode[];
  }
  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;
    if ("@graph" in obj) {
      const context = (obj["@context"] as Record<string, string>) || {};
      const graph = obj["@graph"] as unknown[];
      return graph.map((node) => expandNode(node, context));
    }
    if ("@id" in obj) {
      return [obj as JsonLdNode];
    }
  }
  throw new Error("Unrecognized JSON-LD format");
}

// ── Compacted → expanded conversion ──

function expandNode(
  node: unknown,
  context: Record<string, string>,
): JsonLdNode {
  const raw = node as Record<string, unknown>;
  const expanded: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (key === "@id") {
      expanded["@id"] = expandUri(String(value), context);
    } else if (key === "@type") {
      const types = Array.isArray(value) ? value : [value];
      expanded["@type"] = types.map((t) => expandUri(String(t), context));
    } else if (key === "@context") {
      // skip — consumed at the document level
    } else {
      const expandedKey = expandUri(key, context);
      expanded[expandedKey] = normalizePropertyValues(value, context);
    }
  }

  return expanded as unknown as JsonLdNode;
}

function expandUri(uri: string, context: Record<string, string>): string {
  if (uri.includes("://") || uri.startsWith("urn:")) return uri;
  const colonIdx = uri.indexOf(":");
  if (colonIdx > 0) {
    const prefix = uri.slice(0, colonIdx);
    const local = uri.slice(colonIdx + 1);
    if (context[prefix]) return context[prefix] + local;
  }
  return uri;
}

function normalizePropertyValues(
  value: unknown,
  context: Record<string, string>,
): unknown[] {
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => normalizeSingleValue(v, context));
}

function normalizeSingleValue(
  value: unknown,
  context: Record<string, string>,
): unknown {
  if (typeof value === "string") {
    return { "@value": value };
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return { "@value": value };
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if ("@id" in obj) {
      return { "@id": expandUri(String(obj["@id"]), context) };
    }
    if ("@value" in obj) {
      const result: Record<string, unknown> = { "@value": obj["@value"] };
      if ("@language" in obj) result["@language"] = obj["@language"];
      if ("@type" in obj)
        result["@type"] = expandUri(String(obj["@type"]), context);
      return result;
    }
  }
  return value;
}

// ── Value extraction from expanded JSON-LD nodes ──

function extractLangStrings(node: JsonLdNode, predicate: string): LangString[] {
  const values = node[predicate];
  if (!Array.isArray(values)) return [];
  return values
    .filter(
      (v): v is { "@value": string; "@language"?: string } =>
        typeof v === "object" && v !== null && "@value" in v,
    )
    .map((v) => ({
      value: String(v["@value"]),
      lang: v["@language"] ? String(v["@language"]) : undefined,
    }));
}

function getFirstLiteralValue(
  node: JsonLdNode,
  predicate: string,
): string | undefined {
  const strings = extractLangStrings(node, predicate);
  return strings.length > 0 ? strings[0].value : undefined;
}

function getIdRefs(node: JsonLdNode, predicate: string): string[] {
  const values = node[predicate];
  if (!Array.isArray(values)) return [];
  return values
    .filter(
      (v): v is { "@id": string } =>
        typeof v === "object" && v !== null && "@id" in v,
    )
    .map((v) => String(v["@id"]));
}

function getFirstIdRef(
  node: JsonLdNode,
  predicate: string,
): string | undefined {
  const refs = getIdRefs(node, predicate);
  return refs.length > 0 ? refs[0] : undefined;
}

// ── Normalization helpers ──

function normalizeClass(node: JsonLdNode): OntologyClass {
  const subClassOf = getIdRefs(node, RDFS + "subClassOf");
  const equivalentClass = getIdRefs(node, OWL + "equivalentClass");
  const disjointWith = getIdRefs(node, OWL + "disjointWith");
  return {
    id: node["@id"],
    labels: extractLangStrings(node, RDFS + "label"),
    comment: getFirstLiteralValue(node, RDFS + "comment"),
    subClassOf: subClassOf.length > 0 ? subClassOf : undefined,
    equivalentClass: equivalentClass.length > 0 ? equivalentClass : undefined,
    disjointWith: disjointWith.length > 0 ? disjointWith : undefined,
  };
}

function normalizeProperty(
  node: JsonLdNode,
  propertyType: "object" | "datatype",
): OntologyProperty {
  const types = node["@type"] || [];
  return {
    id: node["@id"],
    propertyType,
    labels: extractLangStrings(node, RDFS + "label"),
    comment: getFirstLiteralValue(node, RDFS + "comment"),
    domain: getFirstIdRef(node, RDFS + "domain"),
    range: getFirstIdRef(node, RDFS + "range"),
    functional: types.includes(OWL + "FunctionalProperty") || undefined,
    inverseFunctional:
      propertyType === "object"
        ? types.includes(OWL + "InverseFunctionalProperty") || undefined
        : undefined,
    inverseOf:
      propertyType === "object"
        ? getFirstIdRef(node, OWL + "inverseOf")
        : undefined,
    subPropertyOf: getFirstIdRef(node, RDFS + "subPropertyOf"),
  };
}

// ── Denormalization helpers ──

function buildLangValue(ls: LangString): Record<string, string> {
  const v: Record<string, string> = { "@value": ls.value };
  if (ls.lang) v["@language"] = ls.lang;
  return v;
}

function denormalizeClass(cls: OntologyClass): JsonLdNode {
  const node: Record<string, unknown> = {
    "@id": cls.id,
    "@type": [OWL + "Class"],
  };
  if (cls.labels.length > 0) {
    node[RDFS + "label"] = cls.labels.map(buildLangValue);
  }
  if (cls.comment) {
    node[RDFS + "comment"] = [{ "@language": "en", "@value": cls.comment }];
  }
  if (cls.subClassOf?.length) {
    node[RDFS + "subClassOf"] = cls.subClassOf.map((id) => ({ "@id": id }));
  }
  if (cls.equivalentClass?.length) {
    node[OWL + "equivalentClass"] = cls.equivalentClass.map((id) => ({
      "@id": id,
    }));
  }
  if (cls.disjointWith?.length) {
    node[OWL + "disjointWith"] = cls.disjointWith.map((id) => ({
      "@id": id,
    }));
  }
  return node as JsonLdNode;
}

function denormalizeProperty(prop: OntologyProperty): JsonLdNode {
  const typeUri =
    prop.propertyType === "object"
      ? OWL + "ObjectProperty"
      : OWL + "DatatypeProperty";
  const types = [typeUri];
  if (prop.functional) types.push(OWL + "FunctionalProperty");
  if (prop.inverseFunctional)
    types.push(OWL + "InverseFunctionalProperty");

  const node: Record<string, unknown> = {
    "@id": prop.id,
    "@type": types,
  };
  if (prop.labels.length > 0) {
    node[RDFS + "label"] = prop.labels.map(buildLangValue);
  }
  if (prop.comment) {
    node[RDFS + "comment"] = [{ "@language": "en", "@value": prop.comment }];
  }
  if (prop.domain) {
    node[RDFS + "domain"] = [{ "@id": prop.domain }];
  }
  if (prop.range) {
    node[RDFS + "range"] = [{ "@id": prop.range }];
  }
  if (prop.inverseOf) {
    node[OWL + "inverseOf"] = [{ "@id": prop.inverseOf }];
  }
  if (prop.subPropertyOf) {
    node[RDFS + "subPropertyOf"] = [{ "@id": prop.subPropertyOf }];
  }
  return node as JsonLdNode;
}
