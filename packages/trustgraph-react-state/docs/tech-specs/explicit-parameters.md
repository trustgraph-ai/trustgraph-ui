# Explicit Parameters for State Hooks

## Problem

State hooks currently use `useSettings()` internally to pull default values for `collection`, `user`, and GraphRAG parameters. This creates issues:

- **Not composable**: Can't use multiple collections in same UI
- **Hidden dependencies**: Not clear what data hooks need
- **Hard to test**: Must mock settings
- **Requires settings**: Can't build simple apps without settings infrastructure
- **Settings as singleton**: Only one settings object possible

## Solution

Remove all internal `useSettings()` calls. Make all parameters explicit.

## Changes Required

### 1. Remove useSettings from hooks

**Affected hooks:**
- `useInference` (inference.ts)
- `useGraphSubgraph` (graph-query.ts)
- `useVectorSearch` (vector-search.ts)
- `useEntityDetail` (entity-query.ts)
- `useTriples` (triples.ts)
- `useLibrary` (library.ts)
- `useChatSession` (chat-session.ts)
- Others using settings internally

### 2. Add explicit parameters

**Pattern for most hooks:**
```typescript
// Before
const data = useVectorSearch();
  // internally: settings.collection

// After
const { settings } = useSettings();
const data = useVectorSearch({ collection: settings.collection });
```

**For GraphRAG (multiple parameters):**
```typescript
// Before
graphRag({ input, options, collection })
  // internally pulls settings.collection if not provided

// After
const { settings } = useSettings();
graphRag({
  input,
  options: settings.graphrag,
  collection: settings.collection
});
```

### 3. Signature changes

**Simple hooks:**
```typescript
// Required collection parameter
useVectorSearch({ collection: string, flowId?: string })
useTriples({ collection: string, s?, p?, o?, limit? })
useEntityDetail(entityUri: string, flowId: string, collection: string)
```

**Library hook:**
```typescript
// Only collection needed (user from socket context)
useLibrary({ collection: string })
```

**Inference hook:**
```typescript
graphRag({
  input: string,
  options: GraphRagOptions,
  collection: string
})
```

## Benefits

- Hooks work without settings
- Multi-collection UIs trivial to build
- Clear what parameters each hook needs
- Easy to test (pass params directly)
- Settings becomes optional convenience, not requirement

## Migration

Breaking changes - all hook consumers must pass parameters explicitly.

No migration strategy needed - breaking changes acceptable.
