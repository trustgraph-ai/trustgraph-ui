import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "../state/session";

describe("useSessionStore", () => {
  beforeEach(() => {
    // Reset the store before each test
    const store = useSessionStore.getState();
    store.flowId = "default";
    store.flow = null;
    store.flowDescription = "";
  });

  it("should have initial state", () => {
    const state = useSessionStore.getState();
    expect(state.flowId).toBe("default");
    expect(state.flow).toBe(null);
    expect(state.flowDescription).toBe("");
  });

  it("should set flowId", () => {
    const { setFlowId } = useSessionStore.getState();
    setFlowId("test-flow-id");

    const state = useSessionStore.getState();
    expect(state.flowId).toBe("test-flow-id");
  });

  it("should set flow", () => {
    const { setFlow } = useSessionStore.getState();
    setFlow("test-flow");

    const state = useSessionStore.getState();
    expect(state.flow).toBe("test-flow");
  });
});
