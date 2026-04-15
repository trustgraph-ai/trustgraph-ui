import type { BaseApi, ConnectionState } from "@trustgraph/client";
import type { ReactNode } from "react";

/**
 * Props for the SocketProvider component
 */
export interface SocketProviderProps {
  /** Child components that will have access to the socket context */
  children: ReactNode;

  /** TrustGraph user identifier */
  user: string;

  /** Optional API key for authentication */
  apiKey?: string;

  /** Optional custom loading component to show while socket is initializing */
  loadingComponent?: ReactNode;

  /** Optional callback when connection state changes */
  onConnectionStateChange?: (state: ConnectionState | null) => void;

  /** Optional callback when socket is ready */
  onSocketReady?: (socket: BaseApi) => void;
}
