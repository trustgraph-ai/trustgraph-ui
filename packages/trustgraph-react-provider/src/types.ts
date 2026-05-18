import type { BaseApi, ConnectionState } from "@trustgraph/client";
import type { ReactNode } from "react";

/**
 * Props for the SocketProvider component
 */
export interface SocketProviderProps {
  /** Child components that will have access to the socket context */
  children: ReactNode;

  /** Bearer token (JWT or API key). The provider creates the socket
   *  only when a token is supplied; pass undefined/null before login. */
  token: string;

  /** Optional custom loading component to show while socket is initializing */
  loadingComponent?: ReactNode;

  /** Optional callback when connection state changes */
  onConnectionStateChange?: (state: ConnectionState | null) => void;

  /** Optional callback when socket is ready */
  onSocketReady?: (socket: BaseApi) => void;
}
