export interface DatasetIndexEntry {
  id: string;
  name: string;
  description?: string;
  path: string;
}

export interface ManifestWorkspace {
  id: string;
  name: string;
}

export interface ManifestFlow {
  blueprint: string;
  id: string;
  description?: string;
}

export interface ManifestOntology {
  key: string;
  file: string;
}

export interface ManifestKnowledge {
  document_id: string;
  collection: string;
  format: string;
  files: string[];
  flow?: string;
}

export interface ManifestQuery {
  file: string;
}

export interface ManifestTool {
  key: string;
  file: string;
}

export interface ManifestPrompt {
  key: string;
  file: string;
}

export interface ManifestSchema {
  key: string;
  file: string;
}

export interface ManifestStructuredData {
  file: string;
  descriptor: string;
  flow?: string;
}

export interface Manifest {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  detail?: string;
  workspace: ManifestWorkspace;
  flows?: ManifestFlow[];
  ontology?: ManifestOntology[];
  knowledge?: ManifestKnowledge[];
  catalog?: ManifestKnowledge[];
  queries?: ManifestQuery[];
  tools?: ManifestTool[];
  prompts?: ManifestPrompt[];
  schema?: ManifestSchema[];
  structured_data?: ManifestStructuredData[];
}

export interface LogEntry {
  message: string;
  status: "info" | "success" | "error" | "warning";
}

export interface Phase {
  label: string;
  status: "pending" | "active" | "done" | "error";
  details: LogEntry[];
}
