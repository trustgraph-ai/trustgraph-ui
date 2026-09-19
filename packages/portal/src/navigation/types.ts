import type { ComponentType } from "react";

export interface NavigationRequest {
  intent?: string;
  target?: string;
  params?: Record<string, string>;
}

export interface TabEntry {
  label: string;
  icon?: string;
  target: string;
  hidden?: boolean;
}

export interface NavigationConfig {
  default: string;
  router?: {
    url: string;
    globalName: string;
    componentName?: string;
  };
}

export interface ComponentEntry {
  id: string;
  url?: string;
  globalName?: string;
  componentName?: string;
  config?: string;
}

export interface RouteEntry {
  intent?: string;
  target?: string;
  targetType?: string;
  component: string;
  priority?: number;
}

export interface ResolvedComponent {
  id: string;
  Component: ComponentType | null;
  config?: unknown;
}

export interface CardEntry {
  title: string;
  icon: string;
  paletteKey: string;
  description: string;
  screenshot?: string;
  intent?: string;
  target?: string;
}

export interface CardGridConfig {
  title: string;
  description: string;
  pageKey?: string;
  cards: CardEntry[];
}
