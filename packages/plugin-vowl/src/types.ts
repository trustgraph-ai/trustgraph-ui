export interface VowlClass {
  uri: string;
  label: string;
  comment?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface VowlObjectProperty {
  uri: string;
  label: string;
  domain?: string;
  range?: string;
}

export interface VowlDatatypeProperty {
  uri: string;
  label: string;
  domain?: string;
  range?: string;
}

export type VowlSelection =
  | { type: "class"; uri: string }
  | { type: "objectProperty"; uri: string }
  | { type: "datatypeProperty"; uri: string }
  | null;
