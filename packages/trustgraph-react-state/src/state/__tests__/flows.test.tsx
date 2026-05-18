import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useFlows } from "../flows";

// Mock the socket and connection state
const mockSocket = {
  flows: vi.fn(),
};

const mockConnectionState = {
  status: "authenticated",
};

vi.mock("@trustgraph/react-provider", () => ({
  useSocket: () => mockSocket,
  useConnectionState: () => mockConnectionState,
}));

// Mock the notification hook
const mockNotify = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

vi.mock("../../hooks/useNotification", () => ({
  useNotification: () => mockNotify,
}));

// Mock the activity hook
vi.mock("../../hooks/useActivity", () => ({
  useActivity: vi.fn(),
}));

describe("useFlows hook", () => {
  let queryClient: QueryClient;
  let mockFlowsApi: {
    getFlows: ReturnType<typeof vi.fn>;
    getFlow: ReturnType<typeof vi.fn>;
    getFlowBlueprints: ReturnType<typeof vi.fn>;
    getFlowBlueprint: ReturnType<typeof vi.fn>;
    startFlow: ReturnType<typeof vi.fn>;
    stopFlow: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset all mocks
    vi.clearAllMocks();

    // Setup flows API mock
    mockFlowsApi = {
      getFlows: vi.fn(),
      getFlow: vi.fn(),
      getFlowBlueprints: vi.fn(),
      getFlowBlueprint: vi.fn(),
      startFlow: vi.fn(),
      stopFlow: vi.fn(),
    };

    mockSocket.flows.mockReturnValue(mockFlowsApi);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("fetching flows", () => {
    it("should fetch and return flows list", async () => {
      const mockFlows = ["flow1", "flow2", "flow3"];
      const mockFlowDetails = [
        { id: "flow1", description: "Flow 1" },
        { id: "flow2", description: "Flow 2" },
        { id: "flow3", description: "Flow 3" },
      ];

      mockFlowsApi.getFlows.mockResolvedValue(mockFlows);
      mockFlowsApi.getFlow.mockImplementation((id) => {
        const flow = mockFlowDetails.find((f) => f.id === id);
        return Promise.resolve(flow);
      });

      const { result } = renderHook(() => useFlows(), { wrapper });

      await waitFor(() => {
        expect(result.current.flows).toBeDefined();
        expect(result.current.flows).toHaveLength(3);
      });

      expect(result.current.flows).toEqual([
        { ...mockFlowDetails[0], id: "flow1" },
        { ...mockFlowDetails[1], id: "flow2" },
        { ...mockFlowDetails[2], id: "flow3" },
      ]);
    });

    it("should handle empty flows list", async () => {
      mockFlowsApi.getFlows.mockResolvedValue([]);

      const { result } = renderHook(() => useFlows(), { wrapper });

      await waitFor(() => {
        expect(result.current.flows).toBeDefined();
      });

      expect(result.current.flows).toEqual([]);
    });

    it("should handle undefined flow-ids gracefully", async () => {
      // Simulate API returning undefined (which gets converted to [])
      mockFlowsApi.getFlows.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFlows(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should handle undefined gracefully
      expect(result.current.flows).toBeUndefined();
    });
  });

  describe("fetching flow blueprints", () => {
    it("should fetch and return flow blueprints", async () => {
      const mockBlueprintNames = ["blueprint1", "blueprint2"];
      const mockBlueprintDetails = {
        blueprint1: { description: "Blueprint 1 Description" },
        blueprint2: { description: "Blueprint 2 Description" },
      };

      mockFlowsApi.getFlowBlueprints.mockResolvedValue(mockBlueprintNames);
      mockFlowsApi.getFlowBlueprint.mockImplementation((name) =>
        Promise.resolve(mockBlueprintDetails[name])
      );

      const { result } = renderHook(() => useFlows(), { wrapper });

      await waitFor(() => {
        expect(result.current.flowBlueprints).toBeDefined();
        expect(result.current.flowBlueprints).toHaveLength(2);
      });

      expect(result.current.flowBlueprints).toEqual([
        ["blueprint1", { description: "Blueprint 1 Description" }],
        ["blueprint2", { description: "Blueprint 2 Description" }],
      ]);
    });
  });

  describe("starting a flow", () => {
    it("should start a flow with correct parameters", async () => {
      mockFlowsApi.startFlow.mockResolvedValue(undefined);
      mockFlowsApi.getFlows.mockResolvedValue([]);

      const { result } = renderHook(() => useFlows(), { wrapper });

      const onSuccess = vi.fn();

      result.current.startFlow({
        id: "test-flow",
        blueprintName: "test-blueprint",
        description: "Test description",
        onSuccess,
      });

      await waitFor(() => {
        expect(mockFlowsApi.startFlow).toHaveBeenCalledWith(
          "test-flow",
          "test-blueprint",
          "Test description",
          undefined
        );
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(mockNotify.success).toHaveBeenCalledWith("Started flow");
      });
    });

    it("should handle startFlow errors", async () => {
      const error = new Error("Failed to start flow");
      mockFlowsApi.startFlow.mockRejectedValue(error);
      mockFlowsApi.getFlows.mockResolvedValue([]);

      const { result } = renderHook(() => useFlows(), { wrapper });

      result.current.startFlow({
        id: "test-flow",
        blueprintName: "test-blueprint",
        description: "Test description",
      });

      await waitFor(() => {
        expect(mockNotify.error).toHaveBeenCalledWith(error.message);
      });
    });

    it("should invalidate flows query after successful start", async () => {
      mockFlowsApi.startFlow.mockResolvedValue(undefined);
      mockFlowsApi.getFlows.mockResolvedValue([]);

      const { result } = renderHook(() => useFlows(), { wrapper });

      // Track getFlows calls
      const initialCallCount = mockFlowsApi.getFlows.mock.calls.length;

      result.current.startFlow({
        id: "test-flow",
        blueprintName: "test-blueprint",
        description: "Test description",
      });

      await waitFor(() => {
        expect(mockNotify.success).toHaveBeenCalled();
      });

      // Verify flows are refetched after successful start
      await waitFor(() => {
        expect(mockFlowsApi.getFlows.mock.calls.length).toBeGreaterThan(
          initialCallCount
        );
      });
    });
  });

  describe("stopping flows", () => {
    it("should stop multiple flows", async () => {
      mockFlowsApi.stopFlow.mockResolvedValue(undefined);
      mockFlowsApi.getFlows.mockResolvedValue([]);

      const { result } = renderHook(() => useFlows(), { wrapper });

      const onSuccess = vi.fn();
      const flowIds = ["flow1", "flow2", "flow3"];

      result.current.stopFlows({
        ids: flowIds,
        onSuccess,
      });

      await waitFor(() => {
        expect(mockFlowsApi.stopFlow).toHaveBeenCalledTimes(3);
        expect(mockFlowsApi.stopFlow).toHaveBeenCalledWith("flow1");
        expect(mockFlowsApi.stopFlow).toHaveBeenCalledWith("flow2");
        expect(mockFlowsApi.stopFlow).toHaveBeenCalledWith("flow3");
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(mockNotify.success).toHaveBeenCalledWith("Successful deletion");
      });
    });

    it("should handle stopFlow errors", async () => {
      const error = new Error("Failed to stop flow");
      mockFlowsApi.stopFlow.mockRejectedValue(error);
      mockFlowsApi.getFlows.mockResolvedValue([]);

      const { result } = renderHook(() => useFlows(), { wrapper });

      result.current.stopFlows({
        ids: ["flow1"],
      });

      await waitFor(() => {
        expect(mockNotify.error).toHaveBeenCalledWith(error.message);
      });
    });

    it("should invalidate flows query after successful stop", async () => {
      mockFlowsApi.stopFlow.mockResolvedValue(undefined);
      mockFlowsApi.getFlows.mockResolvedValue(["flow1", "flow2"]);
      mockFlowsApi.getFlow.mockResolvedValue({ description: "Test" });

      const { result } = renderHook(() => useFlows(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.flows).toBeDefined();
      });

      const initialCallCount = mockFlowsApi.getFlows.mock.calls.length;

      result.current.stopFlows({
        ids: ["flow1"],
      });

      await waitFor(() => {
        expect(mockNotify.success).toHaveBeenCalledWith("Successful deletion");
      });

      // Verify flows are refetched after successful stop
      await waitFor(() => {
        expect(mockFlowsApi.getFlows.mock.calls.length).toBeGreaterThan(
          initialCallCount
        );
      });
    });
  });

  describe("connection state handling", () => {
    it("should not fetch when socket is not ready", async () => {
      // Set connection state to not ready
      mockConnectionState.status = "connecting";

      renderHook(() => useFlows(), { wrapper });

      // Wait a bit to ensure no calls are made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFlowsApi.getFlows).not.toHaveBeenCalled();
      expect(mockFlowsApi.getFlowBlueprints).not.toHaveBeenCalled();
    });

    it("should fetch when socket becomes ready", async () => {
      mockConnectionState.status = "connecting";
      mockFlowsApi.getFlows.mockResolvedValue([]);
      mockFlowsApi.getFlowBlueprints.mockResolvedValue([]);

      const { rerender } = renderHook(() => useFlows(), { wrapper });

      // Initially no fetching
      expect(mockFlowsApi.getFlows).not.toHaveBeenCalled();

      // Change connection state to ready
      mockConnectionState.status = "authenticated";
      rerender();

      // Now it should fetch
      await waitFor(() => {
        expect(mockFlowsApi.getFlows).toHaveBeenCalled();
        expect(mockFlowsApi.getFlowBlueprints).toHaveBeenCalled();
      });
    });
  });
});
