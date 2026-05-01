import React, { useEffect, useState, createContext } from "react";
import {
  createTrustGraphSocket,
  type ConnectionState,
  type BaseApi,
} from "@trustgraph/client";
import type { SocketProviderProps } from "./types";

export const SocketContext = createContext<BaseApi | null>(null);
export const ConnectionStateContext = createContext<
  ConnectionState | null | undefined
>(undefined);

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  token,
  loadingComponent,
  onConnectionStateChange,
  onSocketReady,
}) => {
  const [socket, setSocket] = useState<BaseApi | null>(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ConnectionState | null>(null);

  useEffect(() => {
    console.log("SocketProvider: Creating socket");

    if (socket) {
      console.log("SocketProvider: Token changed, closing existing socket...");
      socket.close();
      setIsSocketReady(false);
    }

    const newSocket = createTrustGraphSocket(token);

    const unsubscribe = newSocket.onConnectionStateChange((state) => {
      setConnectionState(state);
      onConnectionStateChange?.(state);
    });

    setSocket(newSocket);
    setIsSocketReady(true);
    onSocketReady?.(newSocket);

    return () => {
      if (newSocket) {
        console.log("SocketProvider: Cleaning up socket on unmount");
        unsubscribe();
        newSocket.close();
      }
      setIsSocketReady(false);
      setConnectionState(null);
    };
  }, [token]);

  if (!isSocketReady && loadingComponent) {
    return <>{loadingComponent}</>;
  }

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
