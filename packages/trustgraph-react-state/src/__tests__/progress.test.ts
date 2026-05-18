import { describe, it, expect, beforeEach } from "vitest";
import { useProgressStateStore } from "../state/progress";

describe("useProgressStateStore", () => {
  beforeEach(() => {
    // Reset the store before each test
    const store = useProgressStateStore.getState();
    store.activity = new Set();
    store.error = "";
  });

  it("should have initial state", () => {
    const state = useProgressStateStore.getState();
    expect(state.activity.size).toBe(0);
    expect(state.error).toBe("");
  });

  it("should add activity", () => {
    const { addActivity } = useProgressStateStore.getState();
    addActivity("Loading documents");

    const state = useProgressStateStore.getState();
    expect(state.activity.has("Loading documents")).toBe(true);
  });

  it("should remove activity", () => {
    const { addActivity, removeActivity } = useProgressStateStore.getState();
    addActivity("Loading documents");
    removeActivity("Loading documents");

    const state = useProgressStateStore.getState();
    expect(state.activity.has("Loading documents")).toBe(false);
  });

  it("should set error", () => {
    const { setError } = useProgressStateStore.getState();
    setError("Test error");

    const state = useProgressStateStore.getState();
    expect(state.error).toBe("Test error");
  });

  it("should handle multiple activities", () => {
    const { addActivity } = useProgressStateStore.getState();
    addActivity("Activity 1");
    addActivity("Activity 2");
    addActivity("Activity 3");

    const state = useProgressStateStore.getState();
    expect(state.activity.size).toBe(3);
    expect(state.activity.has("Activity 1")).toBe(true);
    expect(state.activity.has("Activity 2")).toBe(true);
    expect(state.activity.has("Activity 3")).toBe(true);
  });
});
