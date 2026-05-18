/** Shared types for agent config items */

export interface AgentPattern {
  name: string;
  description: string;
  max_iterations?: number;
}

export interface AgentTaskType {
  name: string;
  description: string;
  framing: string;
  valid_patterns: string[];
}

export interface ToolArgument {
  name: string;
  type: string;
  description: string;
}

export interface AgentTool {
  name: string;
  description: string;
  type: string;
  arguments?: ToolArgument[];
  template_id?: string;
  mcp_tool_id?: string;
  collection?: string;
  "schema-name"?: string;
  "index-name"?: string;
  limit?: number;
  group?: string[];
  state?: string;
  "applicable-states"?: string[];
  service?: string;
  [key: string]: unknown;
}

export interface McpTool {
  "remote-name": string;
  url: string;
  "auth-token"?: string;
}

export interface ToolServiceParam {
  name: string;
  required?: boolean;
}

export interface ToolService {
  id: string;
  "request-queue": string;
  "response-queue": string;
  "config-params"?: ToolServiceParam[];
}

export type ConfigKind = "agent-pattern" | "agent-task-type" | "tool" | "mcp" | "tool-service";

export interface SelectedItem {
  kind: ConfigKind;
  key: string;
}
