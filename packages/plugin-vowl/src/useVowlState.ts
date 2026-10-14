import { useState, useCallback, useMemo } from "react";
import { useOntologySchema } from "@trustgraph/trustkit";
import type { OntologyClass } from "@trustgraph/trustkit";
import type { VowlClass, VowlSelection } from "./types";

const MAX_INITIAL_CLASSES = 30;

function toVowlClass(cls: OntologyClass, x: number, y: number): VowlClass {
  return { uri: cls.uri, label: cls.label, comment: cls.comment, x, y, vx: 0, vy: 0 };
}

export function useVowlState() {
  const { schema, isLoading, isError } = useOntologySchema();

  const [visibleUris, setVisibleUris] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<VowlSelection>(null);
  const [initialised, setInitialised] = useState(false);

  const addClass = useCallback((uri: string) => {
    setVisibleUris((prev) => {
      if (prev.has(uri)) return prev;
      const next = new Set(prev);
      next.add(uri);
      return next;
    });
  }, []);

  const removeClass = useCallback((uri: string) => {
    setVisibleUris((prev) => {
      const next = new Set(prev);
      next.delete(uri);
      return next;
    });
    setSelection((prev) => (prev?.type === "class" && prev.uri === uri ? null : prev));
  }, []);

  const clearDiagram = useCallback(() => {
    setVisibleUris(new Set());
    setSelection(null);
  }, []);

  const showAll = useCallback(() => {
    if (!schema) return;
    setVisibleUris(new Set(schema.classes.map((c) => c.uri)));
  }, [schema]);

  const loadInitial = useCallback(() => {
    if (!schema || initialised) return;
    setInitialised(true);
    const classes = schema.classes.slice(0, MAX_INITIAL_CLASSES);
    setVisibleUris(new Set(classes.map((c) => c.uri)));
  }, [schema, initialised]);

  if (schema && !initialised) {
    loadInitial();
  }

  const visibleClasses = useMemo((): VowlClass[] => {
    if (!schema) return [];
    const classes = schema.classes.filter((c) => visibleUris.has(c.uri));
    const total = classes.length;
    const radius = Math.max(150, total * 20);
    return classes.map((cls, i) => {
      const angle = (2 * Math.PI * i) / total - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      return toVowlClass(cls, x, y);
    });
  }, [schema, visibleUris]);

  const visibleObjectProperties = useMemo(() => {
    if (!schema) return [];
    return schema.objectProperties.filter(
      (p) =>
        p.domain && p.range && visibleUris.has(p.domain) && visibleUris.has(p.range),
    );
  }, [schema, visibleUris]);

  const visibleSubClassRelations = useMemo(() => {
    if (!schema) return [];
    return schema.subClassRelations.filter(
      (r) => visibleUris.has(r.child) && visibleUris.has(r.parent),
    );
  }, [schema, visibleUris]);

  const visibleDatatypeProperties = useMemo(() => {
    if (!schema) return [];
    return schema.datatypeProperties.filter(
      (p) => p.domain && visibleUris.has(p.domain),
    );
  }, [schema, visibleUris]);

  const selectedClassUri = selection?.type === "class" ? selection.uri : null;

  const relatedClasses = useMemo(() => {
    if (!schema || !selectedClassUri) return [];
    const related = new Set<string>();
    for (const p of schema.objectProperties) {
      if (p.domain === selectedClassUri && p.range) related.add(p.range);
      if (p.range === selectedClassUri && p.domain) related.add(p.domain);
    }
    related.delete(selectedClassUri);
    return schema.classes.filter((c) => related.has(c.uri));
  }, [schema, selectedClassUri]);

  const searchClasses = useCallback(
    (query: string): OntologyClass[] => {
      if (!schema || !query.trim()) return [];
      const q = query.toLowerCase();
      return schema.classes
        .filter((c) => c.label.toLowerCase().includes(q) || c.uri.toLowerCase().includes(q))
        .slice(0, 20);
    },
    [schema],
  );

  return {
    schema,
    isLoading,
    isError,
    visibleClasses,
    visibleObjectProperties,
    visibleSubClassRelations,
    visibleDatatypeProperties,
    visibleUris,
    selection,
    setSelection,
    addClass,
    removeClass,
    clearDiagram,
    showAll,
    searchClasses,
    relatedClasses,
  };
}
