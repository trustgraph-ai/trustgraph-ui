import { useState, useEffect, Component, type ReactNode, type ComponentType } from "react";
import { LoadingState } from "@trustgraph/trustkit";
import { loadRemotePlugin } from "./loadRemotePlugin";

interface RemotePluginProps {
  url: string;
  globalName: string;
  componentName?: string;
}

export function RemotePlugin({ url, globalName, componentName }: RemotePluginProps) {
  const [Comp, setComp] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRemotePlugin(url, globalName, componentName)
      .then((c) => setComp(() => c))
      .catch((err) => setError(String(err)));
  }, [url, globalName]);

  if (error) return <LoadingState variant="error" message={error} />;
  if (!Comp) return <LoadingState message="Loading plugin..." />;

  return (
    <PluginErrorBoundary name={globalName}>
      <Comp />
    </PluginErrorBoundary>
  );
}

interface ErrorBoundaryProps {
  name: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class PluginErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <LoadingState
          variant="error"
          message={`Plugin "${this.props.name}" crashed: ${this.state.error.message}`}
        />
      );
    }
    return this.props.children;
  }
}
