# @trustgraph/react-state

React state management hooks for TrustGraph applications. Provides TanStack Query hooks and Zustand stores for managing application state with a pluggable notification system.

## Features

- 🔌 **Pluggable Notifications** - Component-free notification system with provider pattern
- 📊 **TanStack Query Hooks** - Data fetching and caching for all TrustGraph operations
- 🗃️ **Zustand Stores** - Lightweight state management for UI state
- 🎯 **TypeScript Support** - Full type definitions included
- 🚫 **Zero UI Dependencies** - Bring your own notification/toast UI
- 🔗 **WebSocket Integration** - Works seamlessly with @trustgraph/react-provider

## Installation

```bash
npm install @trustgraph/react-state @trustgraph/react-provider @trustgraph/client
```

## Quick Start

### 1. Set up providers

```typescript
import { SocketProvider } from "@trustgraph/react-provider";
import { NotificationProvider, NotificationHandler } from "@trustgraph/react-state";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create your notification handler (example with toast library)
const notificationHandler: NotificationHandler = {
  success: (message) => toast.success(message),
  error: (message) => toast.error(message),
  warning: (message) => toast.warning(message),
  info: (message) => toast.info(message),
};

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider handler={notificationHandler}>
        <SocketProvider user="your-user" apiKey="optional-api-key">
          <YourApp />
        </SocketProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}
```

### 2. Use state hooks in your components

```typescript
import { useLibrary, useFlows, useSettings } from "@trustgraph/react-state";

function MyComponent() {
  const { documents, deleteDocuments, isLoading } = useLibrary();
  const { flows, startFlow } = useFlows();
  const { settings, updateSetting } = useSettings();

  return (
    <div>
      {isLoading ? "Loading..." : `${documents?.length} documents`}
    </div>
  );
}
```

## Notification System

The package uses a pluggable notification system that allows you to integrate any toast/notification UI library.

### NotificationHandler Interface

```typescript
interface NotificationHandler {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}
```

### Example Implementations

**With Chakra UI:**

```typescript
import { toaster } from "@chakra-ui/react";

const handler: NotificationHandler = {
  success: (msg) => toaster.create({ title: msg, type: "success" }),
  error: (msg) => toaster.create({ title: `Error: ${msg}`, type: "error" }),
  warning: (msg) =>
    toaster.create({ title: `Warning: ${msg}`, type: "warning" }),
  info: (msg) => toaster.create({ title: msg, type: "info" }),
};
```

**With react-hot-toast:**

```typescript
import toast from "react-hot-toast";

const handler: NotificationHandler = {
  success: (msg) => toast.success(msg),
  error: (msg) => toast.error(msg),
  warning: (msg) => toast(msg, { icon: "⚠️" }),
  info: (msg) => toast(msg),
};
```

**With console (testing):**

```typescript
const handler: NotificationHandler = {
  success: (msg) => console.log("✓", msg),
  error: (msg) => console.error("✗", msg),
  warning: (msg) => console.warn("⚠", msg),
  info: (msg) => console.info("ℹ", msg),
};
```

## Available Hooks

### TanStack Query Hooks

#### Document & Library Management

- `useLibrary()` - Manage documents, upload files, submit for processing
- `useProcessing()` - Track document processing status

#### Knowledge Graph Operations

- `useTriples()` - Query RDF triples
- `useGraphSubgraph()` - Retrieve graph subgraphs
- `useGraphEmbeddings()` - Query graph embeddings
- `useVectorSearch()` - Perform vector similarity search
- `useEntityDetail()` - Get entity details
- `useNodeDetails()` - Get node information

#### Flow Management

- `useFlows()` - Manage processing flows
- `useFlowClasses()` - Get available flow classes
- `useFlowParameters()` - Get flow parameter schemas

#### Collections & Organization

- `useCollections()` - Manage document collections
- `useKnowledgeCores()` - Manage knowledge cores

#### Query & Chat

- `useChat()` - Chat interface operations
- `useChatQuery()` - Chat query management
- `useStructuredQuery()` - Structured query operations
- `useRowsQuery()` - Row queries
- `useNlpQuery()` - Natural language processing queries

#### Configuration

- `useSettings()` - Application settings management
- `usePrompts()` - Manage prompts
- `useSchemas()` - Manage schemas
- `useOntologies()` - Manage ontologies
- `useLLMModels()` - LLM model configuration
- `useTokenCosts()` - Token cost tracking

#### Tools

- `useAgentTools()` - Agent tool management
- `useMcpTools()` - MCP tool management

#### Utilities

- `useEmbeddings()` - Generate text embeddings

### Zustand Stores

- `useProgressStateStore()` - Activity indicators and error state
- `useSessionStore()` - Session and flow state
- `useChatStateStore()` - Chat message history
- `useWorkbenchStateStore()` - Workbench UI state (selected entity, tool, etc.)
- `useLoadStateStore()` - Document loading state

### Utility Hooks

- `useNotification()` - Access notification handler
- `useActivity()` - Show/hide activity indicators

## Example Usage

### Managing Documents

```typescript
import { useLibrary } from "@trustgraph/react-state";

function DocumentManager() {
  const {
    documents,
    isLoading,
    deleteDocuments,
    uploadFiles,
    submitDocuments,
  } = useLibrary();

  const handleDelete = (ids: string[]) => {
    deleteDocuments({
      ids,
      onSuccess: () => console.log("Deleted successfully"),
    });
  };

  const handleUpload = (files: File[]) => {
    uploadFiles({
      files,
      params: { title: "My Document", keywords: [] },
      mimeType: "application/pdf",
      user: "current-user",
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {documents?.map((doc) => (
        <div key={doc.id}>{doc.title}</div>
      ))}
    </div>
  );
}
```

### Settings Management

```typescript
import { useSettings } from "@trustgraph/react-state";

function SettingsPanel() {
  const { settings, updateSetting, saveSettings, exportSettings } = useSettings();

  return (
    <div>
      <input
        value={settings.user}
        onChange={(e) => updateSetting("user", e.target.value)}
      />
      <input
        value={settings.collection}
        onChange={(e) => updateSetting("collection", e.target.value)}
      />
      <button onClick={() => console.log(exportSettings())}>
        Export Settings
      </button>
    </div>
  );
}
```

### Using Progress Indicators

```typescript
import { useProgressStateStore, useActivity } from "@trustgraph/react-state";

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  // Automatically shows "Processing data" in activity indicators while isLoading is true
  useActivity(isLoading, "Processing data");

  // Access all current activities
  const activities = useProgressStateStore((state) => state.activity);

  return (
    <div>
      {activities.size > 0 && (
        <div>Active: {Array.from(activities).join(", ")}</div>
      )}
    </div>
  );
}
```

## Type Exports

The package re-exports types from `@trustgraph/client` for convenience:

```typescript
import type {
  Triple,
  Value,
  Entity,
  Message,
  Settings,
  NotificationHandler,
  // ... and more
} from "@trustgraph/react-state";
```

## Utility Functions

The package also exports utility functions:

```typescript
import {
  fileToBase64,
  textToBase64,
  vectorSearch,
  getTriples,
  prepareMetadata,
  createDocId,
} from "@trustgraph/react-state";
```

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run typecheck
```

## Dependencies

### Peer Dependencies (required in your app)

- `react` ^18.0.0
- `@tanstack/react-query` ^5.0.0
- `@trustgraph/client` ^0.1.0
- `@trustgraph/react-provider` ^0.1.0
- `zustand` ^4.0.0 || ^5.0.0

### Runtime Dependencies

- `compute-cosine-similarity` - Vector similarity calculations
- `uuid` - Unique ID generation

## License

Apache 2.0

(c) KnowNext Inc., KnowNext Limited 2025
