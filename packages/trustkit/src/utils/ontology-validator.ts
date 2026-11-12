import type { NormalizedOntology, OntologyProperty } from "@trustgraph/react-state";
import { getLocalName } from "@trustgraph/react-state";

export interface ValidationIssue {
  type: "error" | "warning" | "info";
  category: "classes" | "properties" | "metadata" | "structure";
  itemId?: string;
  itemType?: "class" | "objectProperty" | "datatypeProperty";
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: { errors: number; warnings: number; info: number };
}

export class OntologyValidator {
  static validate(ontology: NormalizedOntology): ValidationResult {
    const issues: ValidationIssue[] = [
      ...this.validateMetadata(ontology),
      ...this.validateClasses(ontology),
      ...this.validateProperties(ontology),
      ...this.validateStructure(ontology),
    ];
    const summary = {
      errors: issues.filter((i) => i.type === "error").length,
      warnings: issues.filter((i) => i.type === "warning").length,
      info: issues.filter((i) => i.type === "info").length,
    };
    return { isValid: summary.errors === 0, issues, summary };
  }

  private static validateMetadata(ontology: NormalizedOntology): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!ontology.metadata.name?.trim()) {
      issues.push({ type: "error", category: "metadata", message: "Ontology name is required", suggestion: "Add a descriptive name for your ontology" });
    }
    if (!ontology.metadata.description?.trim()) {
      issues.push({ type: "warning", category: "metadata", message: "Ontology description is missing", suggestion: "Add a description to help others understand the purpose of this ontology" });
    }
    if (!ontology.metadata.id) {
      issues.push({ type: "error", category: "metadata", message: "Ontology URI is required", suggestion: "Set a valid namespace URI (e.g., http://example.org/myontology#)" });
    } else if (!this.isValidURI(ontology.metadata.id)) {
      issues.push({ type: "error", category: "metadata", message: "Invalid ontology URI format", suggestion: "Use a valid URI format starting with http:// or https://" });
    }
    return issues;
  }

  private static validateClasses(ontology: NormalizedOntology): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const [classId, cls] of ontology.classes) {
      const displayName = getLocalName(classId);
      if (!cls.labels.length || !cls.labels[0]?.value?.trim()) {
        issues.push({ type: "warning", category: "classes", itemId: classId, itemType: "class", message: `Class "${displayName}" has no label`, suggestion: "Add a human-readable label" });
      }
      if (!cls.comment?.trim()) {
        issues.push({ type: "info", category: "classes", itemId: classId, itemType: "class", message: `Class "${displayName}" has no description`, suggestion: "Add a comment to explain what this class represents" });
      }
      if (cls.subClassOf) {
        for (const parentUri of cls.subClassOf) {
          if (!ontology.classes.has(parentUri) && !this.isExternalReference(parentUri)) {
            issues.push({ type: "error", category: "classes", itemId: classId, itemType: "class", message: `Class "${displayName}" references non-existent parent class "${getLocalName(parentUri)}"`, suggestion: "Remove the invalid parent reference or create the missing class" });
          }
        }
      }
      if (!this.isValidURI(cls.id)) {
        issues.push({ type: "error", category: "classes", itemId: classId, itemType: "class", message: `Class "${displayName}" has invalid URI format`, suggestion: "Ensure the URI follows a valid format" });
      }
    }
    const circularDeps = this.findCircularDependencies(ontology);
    circularDeps.forEach((cycle) => {
      issues.push({ type: "error", category: "structure", message: `Circular dependency detected: ${cycle.map(getLocalName).join(" \u2192 ")}`, suggestion: "Remove one of the subclass relationships to break the cycle" });
    });
    return issues;
  }

  private static validateProperties(ontology: NormalizedOntology): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const [propId, property] of ontology.objectProperties) {
      issues.push(...this.validateProperty(propId, property, "objectProperty", ontology));
    }
    for (const [propId, property] of ontology.datatypeProperties) {
      issues.push(...this.validateProperty(propId, property, "datatypeProperty", ontology));
    }
    return issues;
  }

  private static validateProperty(
    propId: string,
    property: OntologyProperty,
    propType: "objectProperty" | "datatypeProperty",
    ontology: NormalizedOntology,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const displayName = getLocalName(propId);
    const label = propType === "objectProperty" ? "Object" : "Datatype";
    if (!property.labels.length || !property.labels[0]?.value?.trim()) {
      issues.push({ type: "warning", category: "properties", itemId: propId, itemType: propType, message: `${label} property "${displayName}" has no label`, suggestion: "Add a human-readable label" });
    }
    if (!property.comment?.trim()) {
      issues.push({ type: "info", category: "properties", itemId: propId, itemType: propType, message: `${label} property "${displayName}" has no description`, suggestion: "Add a comment to explain what this property represents" });
    }
    if (property.domain && !ontology.classes.has(property.domain)) {
      if (!this.isExternalReference(property.domain)) {
        issues.push({ type: "error", category: "properties", itemId: propId, itemType: propType, message: `Property "${displayName}" references non-existent domain class "${getLocalName(property.domain)}"`, suggestion: "Remove the invalid domain reference or create the missing class" });
      }
    }
    if (propType === "objectProperty" && property.range && !ontology.classes.has(property.range)) {
      if (!this.isExternalReference(property.range)) {
        issues.push({ type: "error", category: "properties", itemId: propId, itemType: propType, message: `Object property "${displayName}" references non-existent range class "${getLocalName(property.range)}"`, suggestion: "Remove the invalid range reference or create the missing class" });
      }
    }
    if (!this.isValidURI(property.id)) {
      issues.push({ type: "error", category: "properties", itemId: propId, itemType: propType, message: `Property "${displayName}" has invalid URI format`, suggestion: "Ensure the URI follows a valid format" });
    }
    return issues;
  }

  private static validateStructure(ontology: NormalizedOntology): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const hasClasses = ontology.classes.size > 0;
    const hasProperties = ontology.objectProperties.size > 0 || ontology.datatypeProperties.size > 0;
    if (!hasClasses && !hasProperties) {
      issues.push({ type: "info", category: "structure", message: "Ontology is empty", suggestion: "Add some classes and properties to define your domain model" });
    } else if (!hasClasses) {
      issues.push({ type: "warning", category: "structure", message: "Ontology has no classes", suggestion: "Add classes to define the main concepts in your domain" });
    } else if (!hasProperties) {
      issues.push({ type: "info", category: "structure", message: "Ontology has no properties", suggestion: "Add properties to define relationships between classes" });
    }
    if (hasClasses && hasProperties) {
      const referencedClasses = new Set<string>();
      for (const cls of ontology.classes.values()) {
        if (cls.subClassOf) cls.subClassOf.forEach((uri) => referencedClasses.add(uri));
      }
      for (const prop of [...ontology.objectProperties.values(), ...ontology.datatypeProperties.values()]) {
        if (prop.domain) referencedClasses.add(prop.domain);
        if (prop.range) referencedClasses.add(prop.range);
      }
      for (const [classId, cls] of ontology.classes) {
        if (!referencedClasses.has(classId) && !cls.subClassOf?.length && !this.hasPropertiesWithDomainOrRange(classId, ontology)) {
          issues.push({ type: "info", category: "structure", itemId: classId, itemType: "class", message: `Class "${getLocalName(classId)}" is not connected to other classes`, suggestion: "Consider adding subclass relationships or properties that use this class" });
        }
      }
    }
    return issues;
  }

  private static findCircularDependencies(ontology: NormalizedOntology): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const dfs = (classId: string, path: string[]): boolean => {
      if (recursionStack.has(classId)) {
        const cycleStart = path.indexOf(classId);
        cycles.push([...path.slice(cycleStart), classId]);
        return true;
      }
      if (visited.has(classId)) return false;
      visited.add(classId);
      recursionStack.add(classId);
      const cls = ontology.classes.get(classId);
      if (cls?.subClassOf) {
        for (const parentUri of cls.subClassOf) {
          if (ontology.classes.has(parentUri)) {
            if (dfs(parentUri, [...path, classId])) return true;
          }
        }
      }
      recursionStack.delete(classId);
      return false;
    };
    for (const classId of ontology.classes.keys()) {
      if (!visited.has(classId)) dfs(classId, []);
    }
    return cycles;
  }

  private static hasPropertiesWithDomainOrRange(classId: string, ontology: NormalizedOntology): boolean {
    for (const prop of [...ontology.objectProperties.values(), ...ontology.datatypeProperties.values()]) {
      if (prop.domain === classId || prop.range === classId) return true;
    }
    return false;
  }

  private static isValidURI(uri: string): boolean {
    try { new URL(uri); return true; } catch { return false; }
  }

  private static isExternalReference(uri: string): boolean {
    const wellKnownNamespaces = [
      "http://www.w3.org/2002/07/owl#",
      "http://www.w3.org/2000/01/rdf-schema#",
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "http://www.w3.org/2001/XMLSchema#",
    ];
    return wellKnownNamespaces.some((ns) => uri.startsWith(ns));
  }
}
