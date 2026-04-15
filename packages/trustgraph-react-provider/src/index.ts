// @trustgraph/react-provider
// React provider for TrustGraph WebSocket connections

// Export the main provider component
export {
  SocketProvider,
  SocketContext,
  ConnectionStateContext,
} from "./SocketProvider";

// Export hooks
export { useSocket } from "./hooks/useSocket";
export { useConnectionState } from "./hooks/useConnectionState";

// Export types
export type { SocketProviderProps } from "./types";

// Re-export types from @trustgraph/client for convenience
export type { BaseApi, ConnectionState, StreamingMetadata } from "@trustgraph/client";
