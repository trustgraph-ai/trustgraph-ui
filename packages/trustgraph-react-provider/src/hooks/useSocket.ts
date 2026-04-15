import { useContext } from "react";
import { SocketContext } from "../SocketProvider";

/**
 * Hook to access the TrustGraph socket instance
 *
 * @throws {Error} If used outside of SocketProvider
 * @returns The BaseApi socket instance
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const socket = useSocket();
 *
 *   const handleQuery = async () => {
 *     const results = await socket.triplesQuery(subject, predicate, object);
 *     console.log(results);
 *   };
 *
 *   return <button onClick={handleQuery}>Query</button>;
 * };
 * ```
 */
export const useSocket = () => {
  const socket = useContext(SocketContext);

  if (!socket) {
    throw new Error("useSocket must be used within a SocketProvider");
  }

  return socket;
};
