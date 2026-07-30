import { useState, useEffect } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore, useSettings } from "@trustgraph/react-state";

const RT = "http://trustgraph.ai/ontology/retail#";

export interface ProductCategory {
  uri: string;
  name: string;
  parentName?: string;
  productCount: number;
}

export interface CategoryRequirement {
  uri: string;
  name: string;
  description: string;
  categoryName: string;
  priority: "essential" | "recommended" | "optional";
  perPerson?: number;
  perGroup?: number;
}

export interface ActivityTemplate {
  uri: string;
  name: string;
  description: string;
  requirements: CategoryRequirement[];
}

export interface CompatConstraint {
  uri: string;
  name: string;
  severity: "hard" | "soft";
  rule: string;
  message: string;
  slotTypes: string[];
}

export interface RetailContextData {
  categories: ProductCategory[];
  activities: ActivityTemplate[];
  constraints: CompatConstraint[];
  totalProducts: number;
  isLoading: boolean;
  error: Error | null;
}

function buildCategoriesQuery(): string {
  return `
PREFIX rt: <${RT}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?cat ?catName ?parentName (COUNT(?product) AS ?count)
WHERE {
  ?cat a rt:ProductCategory ;
       rdfs:label ?catName .
  OPTIONAL {
    ?cat rt:parentCategory ?parent .
    ?parent rdfs:label ?parentName .
  }
  OPTIONAL {
    ?product rt:hasCategory ?cat .
  }
  OPTIONAL {
    ?product rt:hasSubcategory ?cat .
  }
}
GROUP BY ?cat ?catName ?parentName
ORDER BY ?parentName ?catName`;
}

function buildActivitiesQuery(): string {
  return `
PREFIX rt: <${RT}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?activity ?name ?desc
WHERE {
  ?activity a rt:Activity ;
            rdfs:label ?name ;
            rdfs:comment ?desc .
}
ORDER BY ?name`;
}

function buildRequirementsQuery(): string {
  return `
PREFIX rt: <${RT}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?activity ?req ?reqName ?reqDesc ?catName ?priority ?perPerson ?perGroup
WHERE {
  ?activity a rt:Activity ;
            rt:requiresCategory ?req .
  ?req rdfs:label ?reqName ;
       rt:requirementCategory ?cat ;
       rt:requirementPriority ?priority .
  ?cat rdfs:label ?catName .
  OPTIONAL { ?req rdfs:comment ?reqDesc }
  OPTIONAL { ?req rt:minimumQuantityPerPerson ?perPerson }
  OPTIONAL { ?req rt:minimumQuantityPerGroup ?perGroup }
}
ORDER BY ?activity ?priority ?catName`;
}

function buildConstraintsQuery(): string {
  return `
PREFIX rt: <${RT}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?constraint ?name ?type ?rule ?msg ?slotType
WHERE {
  ?constraint a ?type ;
              rdfs:label ?name ;
              rt:constraintRule ?rule .
  ?type rdfs:subClassOf rt:CompatibilityConstraint .
  OPTIONAL { ?constraint rt:errorMessage ?errMsg }
  OPTIONAL { ?constraint rt:warningMessage ?warnMsg }
  BIND(COALESCE(?errMsg, ?warnMsg) AS ?msg)
  OPTIONAL { ?constraint rt:appliesToSlotType ?slotType }
}
ORDER BY ?type ?name`;
}

function buildProductCountQuery(): string {
  return `
PREFIX rt: <${RT}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT (COUNT(DISTINCT ?product) AS ?total)
WHERE {
  ?product a ?type .
  ?type rdfs:subClassOf* rt:Product .
  FILTER(?type != rt:Product)
}`;
}

export function useRetailContext(): RetailContextData {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activities, setActivities] = useState<ActivityTemplate[]>([]);
  const [constraints, setConstraints] = useState<CompatConstraint[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const api = socket.flow(flowId);

        const [catResult, actResult, reqResult, conResult, countResult] =
          await Promise.all([
            api.sparqlQuery(buildCategoriesQuery(), collection),
            api.sparqlQuery(buildActivitiesQuery(), collection),
            api.sparqlQuery(buildRequirementsQuery(), collection),
            api.sparqlQuery(buildConstraintsQuery(), collection),
            api.sparqlQuery(buildProductCountQuery(), collection),
          ]);

        if (cancelled) return;

        const parsedCats: ProductCategory[] = catResult.rows.map((row) => ({
          uri: row.cat,
          name: row.catName,
          parentName: row.parentName || undefined,
          productCount: parseInt(row.count) || 0,
        }));

        // Group requirements by activity URI
        const reqsByActivity = new Map<string, CategoryRequirement[]>();
        for (const row of reqResult.rows) {
          const list = reqsByActivity.get(row.activity) || [];
          list.push({
            uri: row.req,
            name: row.reqName,
            description: row.reqDesc || "",
            categoryName: row.catName,
            priority: (row.priority as CategoryRequirement["priority"]) || "optional",
            perPerson: row.perPerson ? parseInt(row.perPerson) : undefined,
            perGroup: row.perGroup ? parseInt(row.perGroup) : undefined,
          });
          reqsByActivity.set(row.activity, list);
        }

        const parsedActs: ActivityTemplate[] = actResult.rows.map((row) => ({
          uri: row.activity,
          name: row.name,
          description: row.desc || "",
          requirements: reqsByActivity.get(row.activity) || [],
        }));

        // Group constraint rows by constraint URI (multiple slotTypes per constraint)
        const constraintMap = new Map<string, CompatConstraint>();
        for (const row of conResult.rows) {
          const existing = constraintMap.get(row.constraint);
          if (existing) {
            if (row.slotType && !existing.slotTypes.includes(row.slotType)) {
              existing.slotTypes.push(row.slotType);
            }
          } else {
            constraintMap.set(row.constraint, {
              uri: row.constraint,
              name: row.name,
              severity: row.type?.includes("HardConstraint") ? "hard" : "soft",
              rule: row.rule || "",
              message: row.msg || "",
              slotTypes: row.slotType ? [row.slotType] : [],
            });
          }
        }

        setCategories(parsedCats);
        setActivities(parsedActs);
        setConstraints(Array.from(constraintMap.values()));
        setTotalProducts(parseInt(countResult.rows[0]?.total) || 0);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [socket, flowId, generation, collection]);

  return { categories, activities, constraints, totalProducts, isLoading, error };
}
