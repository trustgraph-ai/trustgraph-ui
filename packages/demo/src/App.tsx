import { useState, useEffect } from "react";
import type { DomainKey, Entity } from "@trustgraph/trustkit";
import { Header, StatusBar, Toaster, useGraphData, toast, WorkspaceSwitcher } from "@trustgraph/trustkit";
import { useLogout, useWorkspaceSync } from "@trustgraph/react-state";
import { HomePage, DemosPage, IngestPage, ExploreView, GraphRagPage, DocRagPage, AgentPage, GraphView, QueryView, ExplainView, DataView, OntologyView, RawGraphPage, PromptPage, AgentConfigPage, OntologyManagePage, SchemaPage, PlaygroundPage, WorldEventsPage, SparqlPage, GraphqlPage, SolarMissionsPage, HwSecPage, RetailAssistantPage, BrandAnalyticsPage } from "./pages";

type View = "home" | "demos" | "ingest" | "explore" | "graph-rag" | "doc-rag" | "agent" | "graph" | "query" | "explain" | "data" | "ontology" | "raw-graph" | "prompts" | "agent-config" | "ontology-manage" | "schemas" | "playground" | "world-events" | "sparql" | "graphql" | "solar-missions" | "hwsec" | "retail-assistant" | "brand-analytics";

export default function App() {
  const [activeView, setActiveView] = useState<View>("home");
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

  const handleNavigate = (view: string) => {
    setActiveView(view as View);
  };

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

      {activeView === "home" && <HomePage onNavigate={handleNavigate} />}

      {activeView === "demos" && <DemosPage onNavigate={handleNavigate} />}

      {activeView === "ingest" && <IngestPage />}

      {activeView === "explore" && <ExploreView />}

      {activeView === "graph-rag" && <GraphRagPage />}

      {activeView === "doc-rag" && <DocRagPage />}

      {activeView === "agent" && <AgentPage />}

      {activeView === "graph" && (
        <GraphView
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          selectedNode={selectedNode}
          onNodeSelect={setSelectedNode}
        />
      )}

      {activeView === "query" && <QueryView />}

      {activeView === "explain" && <ExplainView />}

      {activeView === "data" && <DataView />}

      {activeView === "ontology" && <OntologyView />}

      {activeView === "raw-graph" && <RawGraphPage />}

      {activeView === "prompts" && <PromptPage />}

      {activeView === "agent-config" && <AgentConfigPage />}

      {activeView === "ontology-manage" && <OntologyManagePage />}

      {activeView === "schemas" && <SchemaPage />}

      {activeView === "playground" && <PlaygroundPage />}

      {activeView === "sparql" && <SparqlPage />}

      {activeView === "world-events" && <WorldEventsPage />}

      {activeView === "solar-missions" && <SolarMissionsPage />}

      {activeView === "graphql" && <GraphqlPage />}

      {activeView === "hwsec" && <HwSecPage />}

      {activeView === "retail-assistant" && <RetailAssistantPage />}

      {activeView === "brand-analytics" && <BrandAnalyticsPage />}

      <StatusBar />
      <Toaster />
    </div>
  );
}
