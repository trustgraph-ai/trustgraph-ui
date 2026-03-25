import { useState, useEffect } from "react";
import type { DomainKey, Entity } from "@trustgraph/trustkit";
import { Header, StatusBar, Toaster, useGraphData, toast } from "@trustgraph/trustkit";
import { HomePage, ExploreView, GraphRagPage, GraphView, QueryView, ExplainView, DataView, OntologyView } from "./pages";

type View = "home" | "explore" | "graph-rag" | "graph" | "query" | "explain" | "data" | "ontology";

export default function App() {
  const [activeView, setActiveView] = useState<View>("home");
  const [activeFilter, setActiveFilter] = useState<DomainKey | null>(null);
  const [selectedNode, setSelectedNode] = useState<Entity | null>(null);
  const { entities, isLoading } = useGraphData();

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
      width: "100%", minHeight: "100vh", background: "#0A0A0F",
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      color: "#E5E5E5", overflow: "hidden",
    }}>
      <Header activeTab={activeView as any} onTabChange={handleNavigate} />

      {activeView === "home" && <HomePage onNavigate={handleNavigate} />}

      {activeView === "explore" && <ExploreView />}

      {activeView === "graph-rag" && <GraphRagPage />}

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

      <StatusBar />
      <Toaster />
    </div>
  );
}
