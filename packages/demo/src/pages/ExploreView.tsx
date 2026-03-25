import { GraphExplorer } from "@trustgraph/trustkit";

/**
 * Knowledge Explorer workflow — uses the GraphExplorer composite
 * from trustkit. This is the simplest possible integration: one
 * component, no additional wiring.
 */
export function ExploreView() {
  return <GraphExplorer renderer="svg" />;
}
