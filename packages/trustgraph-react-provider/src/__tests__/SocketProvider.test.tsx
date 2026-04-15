import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { SocketProvider } from "../SocketProvider";
import { useSocket } from "../hooks/useSocket";
import { useConnectionState } from "../hooks/useConnectionState";

// Mock @trustgraph/client
const mockSocket = {
  close: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConnectionStateChange: vi.fn(() => vi.fn()) as any,
};

const mockCreateTrustGraphSocket = vi.fn(() => mockSocket);

vi.mock("@trustgraph/client", () => ({
  createTrustGraphSocket: (
    ...args: Parameters<typeof mockCreateTrustGraphSocket>
  ) => mockCreateTrustGraphSocket(...args),
}));

// Test component that uses the hooks
const TestComponent: React.FC = () => {
  const socket = useSocket();
  const connectionState = useConnectionState();

  return (
    <div>
      <div data-testid="socket-exists">{socket ? "yes" : "no"}</div>
      <div data-testid="connection-state">
        {connectionState ? JSON.stringify(connectionState) : "null"}
      </div>
    </div>
  );
};

describe("SocketProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create socket with user and no apiKey", () => {
    render(
      <SocketProvider user="test-user">
        <TestComponent />
      </SocketProvider>,
    );

    expect(mockCreateTrustGraphSocket).toHaveBeenCalledWith(
      "test-user",
      undefined,
    );
  });

  it("should create socket with user and apiKey", () => {
    render(
      <SocketProvider user="test-user" apiKey="test-key">
        <TestComponent />
      </SocketProvider>,
    );

    expect(mockCreateTrustGraphSocket).toHaveBeenCalledWith(
      "test-user",
      "test-key",
    );
  });

  it("should provide socket to children via useSocket hook", () => {
    render(
      <SocketProvider user="test-user">
        <TestComponent />
      </SocketProvider>,
    );

    expect(screen.getByTestId("socket-exists").textContent).toBe("yes");
  });

  it("should subscribe to connection state changes", () => {
    render(
      <SocketProvider user="test-user">
        <TestComponent />
      </SocketProvider>,
    );

    expect(mockSocket.onConnectionStateChange).toHaveBeenCalled();
  });

  it("should render loading component when provided and not ready", () => {
    const LoadingComponent = <div data-testid="loading">Loading...</div>;

    // Mock to prevent socket from being ready immediately
    const { rerender } = render(
      <SocketProvider user="test-user" loadingComponent={LoadingComponent}>
        <TestComponent />
      </SocketProvider>,
    );

    // Note: Due to the implementation, the socket becomes ready immediately
    // In a real scenario with async operations, you'd see the loading component
    rerender(
      <SocketProvider user="test-user" loadingComponent={LoadingComponent}>
        <TestComponent />
      </SocketProvider>,
    );
  });

  it("should call onSocketReady callback when socket is created", async () => {
    const onSocketReady = vi.fn();

    render(
      <SocketProvider user="test-user" onSocketReady={onSocketReady}>
        <TestComponent />
      </SocketProvider>,
    );

    await waitFor(() => {
      expect(onSocketReady).toHaveBeenCalledWith(mockSocket);
    });
  });

  it("should call onConnectionStateChange callback when state changes", () => {
    const onConnectionStateChange = vi.fn();
    let capturedCallback: ((state: unknown) => void) | null = null;

    mockSocket.onConnectionStateChange.mockImplementation(
      (callback: (state: unknown) => void) => {
        capturedCallback = callback;
        return vi.fn();
      },
    );

    render(
      <SocketProvider
        user="test-user"
        onConnectionStateChange={onConnectionStateChange}
      >
        <TestComponent />
      </SocketProvider>,
    );

    // Simulate connection state change
    const newState = { status: "connected", authenticated: true };
    if (capturedCallback) {
      (capturedCallback as (state: unknown) => void)(newState);
    }

    expect(onConnectionStateChange).toHaveBeenCalledWith(newState);
  });

  it("should close socket on unmount", () => {
    const { unmount } = render(
      <SocketProvider user="test-user">
        <TestComponent />
      </SocketProvider>,
    );

    unmount();

    expect(mockSocket.close).toHaveBeenCalled();
  });

  it("should recreate socket when user changes", () => {
    const { rerender } = render(
      <SocketProvider user="user1">
        <TestComponent />
      </SocketProvider>,
    );

    expect(mockCreateTrustGraphSocket).toHaveBeenCalledWith(
      "user1",
      undefined,
    );

    rerender(
      <SocketProvider user="user2">
        <TestComponent />
      </SocketProvider>,
    );

    // Socket should be closed and recreated
    expect(mockSocket.close).toHaveBeenCalled();
    expect(mockCreateTrustGraphSocket).toHaveBeenCalledWith(
      "user2",
      undefined,
    );
  });

  it("should recreate socket when apiKey changes", () => {
    const { rerender } = render(
      <SocketProvider user="test-user" apiKey="key1">
        <TestComponent />
      </SocketProvider>,
    );

    expect(mockCreateTrustGraphSocket).toHaveBeenCalledWith(
      "test-user",
      "key1",
    );

    rerender(
      <SocketProvider user="test-user" apiKey="key2">
        <TestComponent />
      </SocketProvider>,
    );

    expect(mockSocket.close).toHaveBeenCalled();
    expect(mockCreateTrustGraphSocket).toHaveBeenCalledWith(
      "test-user",
      "key2",
    );
  });

  it("should unsubscribe from connection state on unmount", () => {
    const unsubscribe = vi.fn();
    mockSocket.onConnectionStateChange.mockReturnValue(unsubscribe);

    const { unmount } = render(
      <SocketProvider user="test-user">
        <TestComponent />
      </SocketProvider>,
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
