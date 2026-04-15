import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { useSocket } from "../hooks/useSocket";
import { SocketProvider } from "../SocketProvider";

// Mock @trustgraph/client
const mockSocket = {
  close: vi.fn(),
  onConnectionStateChange: vi.fn(() => vi.fn()),
  triplesQuery: vi.fn(),
  textCompletion: vi.fn(),
  graphRag: vi.fn(),
  agent: vi.fn(),
  embeddings: vi.fn(),
  graphEmbeddingsQuery: vi.fn(),
  loadDocument: vi.fn(),
  loadText: vi.fn(),
};

vi.mock("@trustgraph/client", () => ({
  createTrustGraphSocket: () => mockSocket,
}));

describe("useSocket", () => {
  it("should return socket instance when used within SocketProvider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SocketProvider user="test-user">{children}</SocketProvider>
    );

    const { result } = renderHook(() => useSocket(), { wrapper });

    expect(result.current).toBe(mockSocket);
  });

  it("should throw error when used outside SocketProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useSocket());
    }).toThrow("useSocket must be used within a SocketProvider");

    consoleSpy.mockRestore();
  });

  it("should provide all socket methods", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SocketProvider user="test-user">{children}</SocketProvider>
    );

    const { result } = renderHook(() => useSocket(), { wrapper });

    const requiredMethods = [
      "triplesQuery",
      "textCompletion",
      "graphRag",
      "agent",
      "embeddings",
      "graphEmbeddingsQuery",
      "loadDocument",
      "loadText",
      "close",
    ];

    requiredMethods.forEach((method) => {
      expect(result.current).toHaveProperty(method);
      expect(
        typeof (result.current as unknown as Record<string, unknown>)[method],
      ).toBe("function");
    });
  });

  it("should maintain reference stability across renders", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SocketProvider user="test-user">{children}</SocketProvider>
    );

    const { result, rerender } = renderHook(() => useSocket(), { wrapper });

    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });
});
