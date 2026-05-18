import type { Ontology, OWLObjectProperty, OWLDatatypeProperty } from "@trustgraph/react-state";

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
  static validate(ontology: Ontology): ValidationResult {
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

  private static validateMetadata(ontology: Ontology): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!ontology.metadata.name?.trim()) {
      issues.push({ type: "error", category: "metadata", message: "Ontology name is required", suggestion: "Add a descriptive name for your ontology" });
    }
    if (!ontology.metadata.description?.trim()) {
      issues.push({ type: "warning", category: "metadata", message: "Ontology description is missing", suggestion: "Add a description to help others understand the purpose of this ontology" });
    }
    if (!ontology.metadata.namespace) {
      issues.push({ type: "error", category: "metadata", message: "Namespace URI is required", suggestion: "Set a valid namespace URI (e.g., http://example.org/myontology#)" });
    } else if (!this.isValidURI(ontology.metadata.namespace)) {
      issues.push({ type: "error", category: "metadata", message: "Invalid namespace URI format", suggestion: "Use a valid URI format starting with http:// or https://" });
    }
    return issues;
  }

  private static validateClasses(ontology: Ontology): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    Object.entries(ontology.classes).forEach(([classId, owlClass]) => {
      if (!owlClass["rdfs:label"] || owlClass["rdfs:label"].length === 0 || !owlClass["rdfs:label"][0]?.value?.trim()) {
        issues.push({ type: "warning", category: "classes", itemId: classId, itemType: "class", message: `Class "${classId}" has no label`, suggestion: "Add a human-readable label" });
      }
      if (!owlClass["rdfs:comment"]?.trim()) {
        issues.push({ type: "info", category: "classes", itemId: classId, itemType: "class", message: `Class "${classId}" has no description`, suggestion: "Add a comment to explain what this class represents" });
      }
      const subClassOf = owlClass["rdfs:subClassOf"];
      if (subClassOf && !ontology.classes[subClassOf]) {
        if (!this.isExternalClassReference(subClassOf)) {
          issues.push({ type: "error", category: "classes", itemId: classId, itemType: "class", message: `Class "${classId}" references non-existent parent class "${subClassOf}"`, suggestion: "Remove the invalid parent reference or create the missing class" });
        }
      }
      if (!this.isValidURI(owlClass.uri)) {
        issues.push({ type: "error", category: "classes", itemId: classId, itemType: "class", message: `Class "${classId}" has invalid URI format`, suggestion: "Ensure the URI follows a valid format" });
      }
    });
    const circularDeps = this.findCircularDependencies(ontology);
    circularDeps.forEach((cycle) => {
      issues.push({ type: "error", category: "structure", message: `Circular dependency detected: ${cycle.join(" → ")}`, suggestion: "Remove one of the subclass relationships to break the cycle" });
    });
    return issues;
  }

  private static validateProperties(ontology: Ontology): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    Object.entries(ontology.objectProperties).forEach(([propId, property]) => {
      issues.push(...this.validateProperty(propId, property, "objectProperty", ontology));
    });
    Object.entries(ontology.datatypeProperties).forEach(([propId, property]) => {
      issues.push(...this.validateProperty(propId, property, "datatypeProperty", ontology));
    });
    return issues;
  }

  private static validateProperty(
    propId: string,
    property: OWLObjectProperty | OWLDatatypeProperty,
    propType: "objectProperty" | "datatypeProperty",
    ontology: Ontology,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const label = propType === "objectProperty" ? "Object" : "Datatype";
    if (!property["rdfs:label"] || property["rdfs:label"].length === 0 || !property["rdfs:label"][0]?.value?.trim()) {
      issues.push({ type: "warning", category: "properties", itemId: propId, itemType: propType, message: `${label} property "${propId}" has no label`, suggestion: "Add a human-readable label" });
    }
    if (!property["rdfs:comment"]?.trim()) {
      issues.push({ type: "info", category: "properties", itemId: propId, itemType: propType, message: `${label} property "${propId}" has no description`, suggestion: "Add a comment to explain what this property represents" });
    }
    const domain = property["rdfs:domain"];
    if (domain && !ontology.classes[domain]) {
      if (!this.isExternalClassReference(domain)) {
        issues.push({ type: "error", category: "properties", itemId: propId, itemType: propType, message: `Property "${propId}" references non-existent domain class "${domain}"`, suggestion: "Remove the invalid domain reference or create the missing class" });
      }
    }
    if (propType === "objectProperty") {
      const range = property["rdfs:range"];
      if (range && !ontology.classes[range]) {
        if (!this.isExternalClassReference(range)) {
          issues.push({ type: "error", category: "properties", itemId: propId, itemType: propType, message: `Object property "${propId}" references non-existent range class "${range}"`, suggestion: "Remove the invalid range reference or create the missing class" });
        }
      }
    }
    if (!this.isValidURI(property.uri)) {
      issues.push({ type: "error", category: "properties", itemId: propId, itemType: propType, message: `Property "${propId}" has invalid URI format`, suggestion: "Ensure the URI follows a valid format" });
    }
    return issues;
  }

  private static validateStructure(ontology: Ontology): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const hasClasses = Object.keys(ontology.classes).length > 0;
    const hasProperties = Object.keys(ontology.objectProperties).length > 0 || Object.keys(ontology.datatypeProperties).length > 0;
    if (!hasClasses && !hasProperties) {
      issues.push({ type: "info", category: "structure", message: "Ontology is empty", suggestion: "Add some classes and properties to define your domain model" });
    } else if (!hasClasses) {
      issues.push({ type: "warning", category: "structure", message: "Ontology has no classes", suggestion: "Add classes to define the main concepts in your domain" });
    } else if (!hasProperties) {
      issues.push({ type: "info", category: "structure", message: "Ontology has no properties", suggestion: "Add properties to define relationships between classes" });
    }
    if (hasClasses && hasProperties) {
      const referencedClasses = new Set<string>();
      Object.values(ontology.classes).forEach((cls) => { if (cls["rdfs:subClassOf"]) referencedClasses.add(cls["rdfs:subClassOf"]); });
      [...Object.values(ontology.objectProperties), ...Object.values(ontology.datatypeProperties)].forEach((prop) => {
        if (prop["rdfs:domain"]) referencedClasses.add(prop["rdfs:domain"]);
        if (prop["rdfs:range"]) referencedClasses.add(prop["rdfs:range"]);
      });
      Object.keys(ontology.classes).filter(
        (classId) => !referencedClasses.has(classId) && !ontology.classes[classId]["rdfs:subClassOf"] && !this.hasPropertiesWithDomainOrRange(classId, ontology)
      ).forEach((classId) => {
        issues.push({ type: "info", category: "structure", itemId: classId, itemType: "class", message: `Class "${classId}" is not connected to other classes`, suggestion: "Consider adding subclass relationships or properties that use this class" });
      });
    }
    return issues;
  }

  private static findCircularDependencies(ontology: Ontology): string[][] {
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
      const parent = ontology.classes[classId]?.["rdfs:subClassOf"];
      if (parent && ontology.classes[parent]) {
        if (dfs(parent, [...path, classId])) return true;
      }
      recursionStack.delete(classId);
      return false;
    };
    Object.keys(ontology.classes).forEach((classId) => { if (!visited.has(classId)) dfs(classId, []); });
    return cycles;
  }

  private static hasPropertiesWithDomainOrRange(classId: string, ontology: Ontology): boolean {
    return [...Object.values(ontology.objectProperties), ...Object.values(ontology.datatypeProperties)]
      .some((prop) => prop["rdfs:domain"] === classId || prop["rdfs:range"] === classId);
  }

  private static isValidURI(uri: string): boolean {
    try { new URL(uri); return true; } catch { return false; }
  }

  private static isExternalClassReference(className: string): boolean {
    const standardClasses = ["Seq", "Bag", "Alt", "List", "Statement", "Property", "Thing", "Class", "Ontology", "Collection", "Container"];
    return standardClasses.includes(className);
  }
}
