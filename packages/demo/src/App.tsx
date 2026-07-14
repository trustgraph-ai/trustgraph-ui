import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import type { DomainKey, Entity } from "@trustgraph/trustkit";
import { Header, StatusBar, Toaster, useGraphData, toast, WorkspaceSwitcher } from "@trustgraph/trustkit";
import { useLogout, useWorkspaceSync } from "@trustgraph/react-state";
import { HomePage, DemosPage, IngestPage, ExploreView, GraphRagPage, DocRagPage, AgentPage, GraphView, QueryView, ExplainView, DataView, OntologyView, RawGraphPage, PromptPage, AgentConfigPage, OntologyManagePage, SchemaPage, PlaygroundPage, WorldEventsPage, SparqlPage, GraphqlPage, SolarMissionsPage, HwSecPage, RetailAssistantPage, BrandAnalyticsPage, InnovationPage, RiskPage, GameTheoryPage, LawInContextPage } from "./pages";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState<DomainKey | null>(null);
  const [selectedNode, setSelectedNode] = useState<Entity | null>(null);
  const { entities, isLoading } = useGraphData();
  const logout = useLogout();

  // Bootstrap the active workspace from whoami and keep the socket's
  // outbound workspace in sync.
  useWorkspaceSync();

  // Notification when graph loads
  useEffect(() => {
    if (!isLoading && entities.length > 0) {
      toast.success(`Graph loaded: ${entities.length} entities`);
    }
  }, [isLoading, entities.length]);

  // Views map 1:1 to routes: "home" is "/", every other view is "/<view>".
  // Navigating through react-router gives real URLs and working browser
  // back/forward, instead of swapping components behind a single URL.
  const handleNavigate = (view: string) => {
    navigate(view === "home" ? "/" : `/${view}`);
  };

  // Derive the active top-level tab from the URL so the header highlight
  // stays in sync with back/forward navigation and deep links.
  const activeView = location.pathname === "/" ? "home" : location.pathname.slice(1);

  return (
    <div style={{
      "--page-height": "calc(100vh - 140px)",
      width: "100%", minHeight: "100vh", background: "#0A0A0F",
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      color: "#E5E5E5", overflow: "hidden",
    } as React.CSSProperties}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <Header activeTab={activeView as any} onTabChange={handleNavigate} />
        </div>
        <WorkspaceSwitcher />
        <button
          onClick={logout}
          style={{
            marginRight: 20, padding: "6px 14px", borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#999", fontSize: 12, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          Sign out
        </button>
      </div>

      <Routes>
        <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
        <Route path="/demos" element={<DemosPage onNavigate={handleNavigate} />} />
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
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/sparql" element={<SparqlPage />} />
        <Route path="/world-events" element={<WorldEventsPage />} />
        <Route path="/solar-missions" element={<SolarMissionsPage />} />
        <Route path="/graphql" element={<GraphqlPage />} />
        <Route path="/hwsec" element={<HwSecPage />} />
        <Route path="/retail-assistant" element={<RetailAssistantPage />} />
        <Route path="/brand-analytics" element={<BrandAnalyticsPage />} />
        <Route path="/innovation" element={<InnovationPage />} />
        <Route path="/risk" element={<RiskPage />} />
        <Route path="/game-theory" element={<GameTheoryPage />} />
        <Route path="/law-in-context" element={<LawInContextPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <StatusBar />
      <Toaster />
    </div>
  );
}
