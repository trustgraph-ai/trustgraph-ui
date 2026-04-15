# @trustgraph/react-provider

React provider for TrustGraph WebSocket connections. This package provides a headless React context provider for managing TrustGraph WebSocket connections in React applications.

## Features

- 🎯 **Headless Design** - Bring your own UI components
- 🔄 **Auto-reconnection** - Handles connection lifecycle automatically
- 🔐 **Authentication Support** - Optional API key authentication
- 📦 **TypeScript** - Full type safety
- ⚡ **Lightweight** - Minimal dependencies

## Installation

```bash
npm install @trustgraph/react-provider @trustgraph/client react
```

## Basic Usage

```tsx
import { SocketProvider, useSocket } from "@trustgraph/react-provider";

function App() {
  return (
    <SocketProvider user="alice">
      <MyComponent />
    </SocketProvider>
  );
}

function MyComponent() {
  const socket = useSocket();

  const handleQuery = async () => {
    const results = await socket.triplesQuery(
      { v: "http://example.org/subject", e: true },
      undefined,
      undefined,
      10,
    );
    console.log(results);
  };

  return <button onClick={handleQuery}>Query</button>;
}
```

## With Authentication

```tsx
<SocketProvider user="alice" apiKey="your-api-key">
  <App />
</SocketProvider>
```

## With Custom Loading UI

```tsx
<SocketProvider
  user="alice"
  loadingComponent={<div>Loading TrustGraph connection...</div>}
>
  <App />
</SocketProvider>
```

## Monitoring Connection State

```tsx
import { useConnectionState } from "@trustgraph/react-provider";

function ConnectionStatus() {
  const state = useConnectionState();

  if (!state) return <div>Initializing...</div>;

  return (
    <div>
      Status: {state.status}
      {state.authenticated && <span> ✓ Authenticated</span>}
    </div>
  );
}
```

## API

### `<SocketProvider>`

Main provider component that manages the WebSocket connection.

**Props:**

- `user: string` - TrustGraph user identifier (required)
- `apiKey?: string` - Optional API key for authentication
- `loadingComponent?: ReactNode` - Custom loading component
- `onConnectionStateChange?: (state: ConnectionState | null) => void` - Connection state callback
- `onSocketReady?: (socket: BaseApi) => void` - Socket ready callback

### `useSocket()`

Hook to access the socket instance.

Returns: `BaseApi`

Throws: Error if used outside SocketProvider

### `useConnectionState()`

Hook to access the connection state.

Returns: `ConnectionState | null`

Throws: Error if used outside SocketProvider

## License

Apache 2.0

(c) KnowNext Inc., KnowNext Limited 2025
