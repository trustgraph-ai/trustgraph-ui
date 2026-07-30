import { useState, useEffect, type ComponentType } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import type { DomainKey, Entity } from "@trustgraph/trustkit";
import { Header, StatusBar, Toaster, useGraphData, toast, WorkspaceSwitcher, ThemeProvider, useTheme } from "@trustgraph/trustkit";
import { useLogout, useWorkspaceSync } from "@trustgraph/react-state";
import { useThemeSettings, ThemePanel } from "./components/ThemePanel";
import { HomePage, DemosPage, IngestPage, ExploreView, GraphRagPage, DocRagPage, AgentPage, GraphView, QueryView, ExplainView, DataView, OntologyView, RawGraphPage, PromptPage, AgentConfigPage, OntologyManagePage, SchemaPage, SparqlPage, GraphqlPage } from "./pages";
import { PluginErrorBoundary } from "./RemotePlugin";
import { usePluginManifest } from "./usePluginManifest";

const BUILTIN_COMPONENTS = new Map<string, ComponentType>([]);

export default function App() {
  const themeSettings = useThemeSettings();

  return (
    <ThemeProvider theme={themeSettings.theme} scale={themeSettings.scale}>
      <AppShell themeSettings={themeSettings} />
    </ThemeProvider>
  );
}

function AppShell({ themeSettings }: { themeSettings: ReturnType<typeof useThemeSettings> }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState<DomainKey | null>(null);
  const [selectedNode, setSelectedNode] = useState<Entity | null>(null);
  const { entities, isLoading } = useGraphData();
  const logout = useLogout();
  const { theme, sz } = useTheme();
  const { plugins } = usePluginManifest("/config/plugins.json", BUILTIN_COMPONENTS);

  useWorkspaceSync();

  useEffect(() => {
    if (!isLoading && entities.length > 0) {
      toast.success(`Graph loaded: ${entities.length} entities`);
    }
  }, [isLoading, entities.length]);

  const handleNavigate = (view: string) => {
    navigate(view === "home" ? "/" : `/${view}`);
  };

  const activeView = location.pathname === "/" ? "home" : location.pathname.slice(1);

  return (
    <div style={{
      "--page-height": "calc(100vh - 140px)",
      width: "100%", minHeight: "100vh", background: theme.surface.base,
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      color: theme.text.primary, overflow: "hidden",
    } as React.CSSProperties}>
      <div style={{
        display: "flex", alignItems: "center",
        background: theme.surface.overlay,
        borderBottom: `1px solid ${theme.border.default}`,
      }}>
        <div style={{ flex: 1 }}>
          <Header activeTab={activeView as any} onTabChange={handleNavigate} />
        </div>
        <WorkspaceSwitcher />
        <button
          onClick={logout}
          style={{
            margin: `0 ${sz(20)}px 0 ${sz(12)}px`, padding: `${sz(6)}px ${sz(14)}px`, borderRadius: 6,
            background: theme.surface.card,
            border: `1px solid ${theme.border.medium}`,
            color: theme.text.subtle, fontSize: sz(12), cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          Sign out
        </button>
      </div>

      <Routes>
        <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
        <Route path="/demos" element={<DemosPage onNavigate={handleNavigate} plugins={plugins} />} />
        <Route path="/ingest" element={<IngestPage />} />
        <Route path="/explore" element={<ExploreView />} />
        <Route path="/graph-rag" element={<GraphRagPage />} />
        <Route path="/doc-rag" element={<DocRagPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route
          path="/graph"
          element={
            <GraphView
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              selectedNode={selectedNode}
              onNodeSelect={setSelectedNode}
            />
          }
        />
        <Route path="/query" element={<QueryView />} />
        <Route path="/explain" element={<ExplainView />} />
        <Route path="/data" element={<DataView />} />
        <Route path="/ontology" element={<OntologyView />} />
        <Route path="/raw-graph" element={<RawGraphPage />} />
        <Route path="/prompts" element={<PromptPage />} />
        <Route path="/agent-config" element={<AgentConfigPage />} />
        <Route path="/ontology-manage" element={<OntologyManagePage />} />
        <Route path="/schemas" element={<SchemaPage />} />
        <Route path="/sparql" element={<SparqlPage />} />
        <Route path="/graphql" element={<GraphqlPage />} />
        {/* Plugin routes — loaded dynamically from /plugins.json */}
        {plugins.map(p => p.Component ? (
          <Route key={p.id} path={`/${p.id}`} element={
            <PluginErrorBoundary name={p.id}>
              <p.Component />
            </PluginErrorBoundary>
          } />
        ) : null)}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <StatusBar />
      <Toaster />
      <ThemePanel settings={themeSettings} />
    </div>
  );
}
