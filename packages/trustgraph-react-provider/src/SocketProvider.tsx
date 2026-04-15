import React, { useEffect, useState, createContext } from "react";
import {
  createTrustGraphSocket,
  type ConnectionState,
  type BaseApi,
} from "@trustgraph/client";
import type { SocketProviderProps } from "./types";

// Create contexts for socket and connection state
export const SocketContext = createContext<BaseApi | null>(null);
export const ConnectionStateContext = createContext<
  ConnectionState | null | undefined
>(undefined);

/**
 * SocketProvider - Manages TrustGraph WebSocket connection
 *
 * This is a headless provider that manages the WebSocket connection lifecycle.
 * It creates a socket when mounted and handles reconnection when user/apiKey changes.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SocketProvider user="alice">
 *   <App />
 * </SocketProvider>
 *
 * // With authentication
 * <SocketProvider user="alice" apiKey="secret-key">
 *   <App />
 * </SocketProvider>
 *
 * // With custom loading UI
 * <SocketProvider
 *   user="alice"
 *   loadingComponent={<MyCustomSpinner />}
 * >
 *   <App />
 * </SocketProvider>
 *
 * // With callbacks
 * <SocketProvider
 *   user="alice"
 *   onConnectionStateChange={(state) => console.log(state)}
 *   onSocketReady={(socket) => console.log('Socket ready:', socket)}
 * >
 *   <App />
 * </SocketProvider>
 * ```
 */
export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  user,
  apiKey,
  loadingComponent,
  onConnectionStateChange,
  onSocketReady,
}) => {
  const [socket, setSocket] = useState<BaseApi | null>(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ConnectionState | null>(null);

  useEffect(() => {
    console.log(
      "SocketProvider: Creating socket with auth:",
      apiKey ? "enabled" : "disabled",
      "user:",
      user,
    );

    // Clean up existing socket before creating new one (for reconnection)
    if (socket) {
      console.log(
        "SocketProvider: User or API key changed, closing existing socket...",
      );
      socket.close();
      setIsSocketReady(false);
    }

    // Create socket with current auth settings and user
    const newSocket = createTrustGraphSocket(user, apiKey);

    // Subscribe to connection state changes
    const unsubscribe = newSocket.onConnectionStateChange((state) => {
      setConnectionState(state);
      onConnectionStateChange?.(state);
    });

    setSocket(newSocket);

    // Mark socket as ready (we don't wait for connection since the socket
    // handles reconnection internally)
    setIsSocketReady(true);
    onSocketReady?.(newSocket);

    return () => {
      if (newSocket) {
        console.log("SocketProvider: Cleaning up socket on unmount");
        unsubscribe(); // Unsubscribe from state changes
        newSocket.close();
      }
      setIsSocketReady(false);
      setConnectionState(null);
    };
  }, [user, apiKey]); // Reconnects when user or API key changes

  // Show loading component if provided and socket not ready
  if (!isSocketReady && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  // If no loading component provided, just wait silently
  if (!isSocketReady) {
    return null;
  }

  return (
    <SocketContext.Provider value={socket}>
      <ConnectionStateContext.Provider value={connectionState}>
        {children}
      </ConnectionStateContext.Provider>
    </SocketContext.Provider>
  );
};
