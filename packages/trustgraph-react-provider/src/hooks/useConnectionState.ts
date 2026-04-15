import { useContext } from "react";
import { ConnectionStateContext } from "../SocketProvider";

/**
 * Hook to access the WebSocket connection state
 *
 * @throws {Error} If used outside of SocketProvider
 * @returns The current ConnectionState or null if not yet initialized
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const connectionState = useConnectionState();
 *
 *   return (
 *     <div>
 *       Status: {connectionState?.status}
 *       {connectionState?.authenticated && <span>✓ Authenticated</span>}
 *     </div>
 *   );
 * };
 * ```
 */
export const useConnectionState = () => {
  const state = useContext(ConnectionStateContext);

  if (state === undefined) {
    throw new Error("useConnectionState must be used within a SocketProvider");
  }

  return state;
};
