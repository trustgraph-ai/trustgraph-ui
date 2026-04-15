import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { useConnectionState } from "../hooks/useConnectionState";
import { SocketProvider } from "../SocketProvider";

// Mock @trustgraph/client
const mockSocket = {
  close: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConnectionStateChange: vi.fn(() => vi.fn()) as any,
};

vi.mock("@trustgraph/client", () => ({
  createTrustGraphSocket: () => mockSocket,
}));

describe("useConnectionState", () => {
  it("should return null initially", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SocketProvider user="test-user">{children}</SocketProvider>
    );

    const { result } = renderHook(() => useConnectionState(), { wrapper });

    expect(result.current).toBeNull();
  });

  it("should throw error when used outside SocketProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useConnectionState());
    }).toThrow("useConnectionState must be used within a SocketProvider");

    consoleSpy.mockRestore();
  });

  it("should update when connection state changes", () => {
    let capturedCallback: ((state: unknown) => void) | null = null;

    mockSocket.onConnectionStateChange.mockImplementation(
      (callback: (state: unknown) => void) => {
        capturedCallback = callback;
        return vi.fn();
      },
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SocketProvider user="test-user">{children}</SocketProvider>
    );

    const { result } = renderHook(() => useConnectionState(), { wrapper });

    expect(result.current).toBeNull();

    // Simulate connection state change
    const newState = { status: "connected", authenticated: true };
    act(() => {
      if (capturedCallback) {
        capturedCallback(newState);
      }
    });

    expect(result.current).toEqual(newState);
  });

  it("should maintain reference stability when state doesn't change", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SocketProvider user="test-user">{children}</SocketProvider>
    );

    const { result, rerender } = renderHook(() => useConnectionState(), {
      wrapper,
    });

    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });

  it("should update to different connection states", () => {
    let capturedCallback: ((state: unknown) => void) | null = null;

    mockSocket.onConnectionStateChange.mockImplementation(
      (callback: (state: unknown) => void) => {
        capturedCallback = callback;
        return vi.fn();
      },
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SocketProvider user="test-user">{children}</SocketProvider>
    );

    const { result } = renderHook(() => useConnectionState(), { wrapper });

    // Test connecting state
    act(() => {
      if (capturedCallback) {
        capturedCallback({ status: "connecting", authenticated: false });
      }
    });

    expect(result.current).toEqual({
      status: "connecting",
      authenticated: false,
    });

    // Test connected state
    act(() => {
      if (capturedCallback) {
        capturedCallback({ status: "connected", authenticated: true });
      }
    });

    expect(result.current).toEqual({
      status: "connected",
      authenticated: true,
    });

    // Test error state
    act(() => {
      if (capturedCallback) {
        capturedCallback({
          status: "error",
          authenticated: false,
          error: "Connection failed",
        });
      }
    });

    expect(result.current).toEqual({
      status: "error",
      authenticated: false,
      error: "Connection failed",
    });
  });
});
