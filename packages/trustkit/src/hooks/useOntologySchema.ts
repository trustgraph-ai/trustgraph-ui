import { useMemo } from "react";
import { useTriples, useSettings } from "@trustgraph/react-state";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const RDFS_DOMAIN = "http://www.w3.org/2000/01/rdf-schema#domain";
const RDFS_RANGE = "http://www.w3.org/2000/01/rdf-schema#range";
const RDFS_COMMENT = "http://www.w3.org/2000/01/rdf-schema#comment";
const RDFS_SUBCLASS_OF = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
const OWL_CLASS = "http://www.w3.org/2002/07/owl#Class";
const OWL_OBJECT_PROPERTY = "http://www.w3.org/2002/07/owl#ObjectProperty";
const OWL_DATATYPE_PROPERTY = "http://www.w3.org/2002/07/owl#DatatypeProperty";

// Helper to extract value from a Term
function getTermValue(term: { t: string; i?: string; v?: string }): string {
  if (term.t === "i") return term.i || "";
  if (term.t === "l") return term.v || "";
  return "";
}

// Helper to get local name from URI
function getLocalName(uri: string): string {
  const hashIndex = uri.lastIndexOf("#");
  const slashIndex = uri.lastIndexOf("/");
  const index = Math.max(hashIndex, slashIndex);
  return index >= 0 ? uri.substring(index + 1) : uri;
}

export interface OntologyClass {
  uri: string;
  label: string;
  comment?: string;
}

export interface OntologyProperty {
  uri: string;
  label: string;
  domain?: string;
  range?: string;
}

export interface SubClassRelation {
  child: string;
  parent: string;
}

export interface OntologySchema {
  classes: OntologyClass[];
  objectProperties: OntologyProperty[];
  datatypeProperties: OntologyProperty[];
  subClassRelations: SubClassRelation[];
  // Sets for quick lookup
  objectPropertyUris: Set<string>;
  datatypePropertyUris: Set<string>;
}

export function useOntologySchema() {
  const { settings } = useSettings();
  const collection = settings.collection;

  // Query for classes
  const classTriples = useTriples({
    p: { t: "i", i: RDF_TYPE },
    o: { t: "i", i: OWL_CLASS },
    limit: 100,
    collection,
  });

  // Query for object properties
  const objectPropertyTriples = useTriples({
    p: { t: "i", i: RDF_TYPE },
    o: { t: "i", i: OWL_OBJECT_PROPERTY },
    limit: 100,
    collection,
  });

  // Query for datatype properties
  const datatypePropertyTriples = useTriples({
    p: { t: "i", i: RDF_TYPE },
    o: { t: "i", i: OWL_DATATYPE_PROPERTY },
    limit: 100,
    collection,
  });

  // Targeted metadata queries
  const labelTriples = useTriples({
    p: { t: "i", i: RDFS_LABEL },
    limit: 500,
    collection,
  });

  const domainTriples = useTriples({
    p: { t: "i", i: RDFS_DOMAIN },
    limit: 500,
    collection,
  });

  const rangeTriples = useTriples({
    p: { t: "i", i: RDFS_RANGE },
    limit: 500,
    collection,
  });

  const commentTriples = useTriples({
    p: { t: "i", i: RDFS_COMMENT },
    limit: 500,
    collection,
  });

  const subClassTriples = useTriples({
    p: { t: "i", i: RDFS_SUBCLASS_OF },
    limit: 500,
    collection,
  });

  const isLoading = classTriples.isLoading || objectPropertyTriples.isLoading ||
                    datatypePropertyTriples.isLoading || labelTriples.isLoading ||
                    domainTriples.isLoading || rangeTriples.isLoading ||
                    commentTriples.isLoading || subClassTriples.isLoading;
  const isError = classTriples.isError || objectPropertyTriples.isError ||
                  datatypePropertyTriples.isError || labelTriples.isError ||
                  domainTriples.isError || rangeTriples.isError ||
                  commentTriples.isError || subClassTriples.isError;
  const error = classTriples.error || objectPropertyTriples.error ||
                datatypePropertyTriples.error || labelTriples.error ||
                domainTriples.error || rangeTriples.error ||
                commentTriples.error || subClassTriples.error;

  const schema = useMemo((): OntologySchema | undefined => {
    if (isLoading || isError) return undefined;

    // Build a map of URI -> metadata from targeted queries
    const metadata = new Map<string, { label?: string; domain?: string; range?: string; comment?: string }>();

    const ensure = (uri: string) => {
      if (!metadata.has(uri)) metadata.set(uri, {});
      return metadata.get(uri)!;
    };

    for (const triple of labelTriples.triples || []) {
      ensure(getTermValue(triple.s)).label = getTermValue(triple.o);
    }
    for (const triple of domainTriples.triples || []) {
      ensure(getTermValue(triple.s)).domain = getTermValue(triple.o);
    }
    for (const triple of rangeTriples.triples || []) {
      ensure(getTermValue(triple.s)).range = getTermValue(triple.o);
    }
    for (const triple of commentTriples.triples || []) {
      ensure(getTermValue(triple.s)).comment = getTermValue(triple.o);
    }

    // Build classes list
    const classes: OntologyClass[] = [];
    for (const triple of classTriples.triples || []) {
      const uri = getTermValue(triple.s);
      const meta = metadata.get(uri) || {};
      classes.push({
        uri,
        label: meta.label || getLocalName(uri),
        comment: meta.comment,
      });
    }

    // Build object properties list
    const objectProperties: OntologyProperty[] = [];
    const objectPropertyUris = new Set<string>();
    for (const triple of objectPropertyTriples.triples || []) {
      const uri = getTermValue(triple.s);
      const meta = metadata.get(uri) || {};
      objectPropertyUris.add(uri);
      objectProperties.push({
        uri,
        label: meta.label || getLocalName(uri),
        domain: meta.domain,
        range: meta.range,
      });
    }

    // Build datatype properties list
    const datatypeProperties: OntologyProperty[] = [];
    const datatypePropertyUris = new Set<string>();
    for (const triple of datatypePropertyTriples.triples || []) {
      const uri = getTermValue(triple.s);
      const meta = metadata.get(uri) || {};
      datatypePropertyUris.add(uri);
      datatypeProperties.push({
        uri,
        label: meta.label || getLocalName(uri),
        domain: meta.domain,
        range: meta.range,
      });
    }

    // Build subclass relations
    const classUriSet = new Set(classes.map((c) => c.uri));
    const subClassRelations: SubClassRelation[] = [];
    for (const triple of subClassTriples.triples || []) {
      const child = getTermValue(triple.s);
      const parent = getTermValue(triple.o);
      if (classUriSet.has(child) && classUriSet.has(parent)) {
        subClassRelations.push({ child, parent });
      }
    }

    return {
      classes,
      objectProperties,
      datatypeProperties,
      subClassRelations,
      objectPropertyUris,
      datatypePropertyUris,
    };
  }, [
    isLoading,
    classTriples.triples,
    objectPropertyTriples.triples,
    datatypePropertyTriples.triples,
    labelTriples.triples,
    domainTriples.triples,
    rangeTriples.triples,
    commentTriples.triples,
    subClassTriples.triples,
  ]);

  return {
    schema,
    isLoading,
    isError,
    error,
  };
}
