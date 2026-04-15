# Remove User Parameter from API Methods

## Problem

The `user` parameter is passed redundantly throughout the codebase:

1. **SocketProvider** receives `user` prop and passes it to `createTrustGraphSocket(user, apiKey)`
2. **BaseApi** stores `user` in `this.user` (line 162, 178)
3. **Many methods** already use `this.api.user` internally (removeDocument, rowsQuery, etc.)
4. **Some methods** still require explicit `user` parameter (listCollections, updateCollection, deleteCollection, loadDocument, addProcessing)
5. **React hooks** pull `user` from settings and pass it explicitly

The `user` is already available in the socket context - no need to pass it repeatedly.

## Current State

### Already using `this.api.user`:
- `removeDocument()` - line 703
- `rowsQuery()` - line 1254
- `nlpQuery()` - line 1301
- Various other methods

### Still requiring explicit `user` parameter:
- `listCollections(user, tagFilter?)` - line 1609
- `updateCollection(user, collection, ...)` - line 1636
- `deleteCollection(user, collection)` - line 1682
- `loadDocument(..., user)` - line 664
- `addProcessing(..., user?, ...)` - line 719

### React hooks passing user explicitly:
- `useLibrary` - passes `settings.user` to mutations
- `useCollections` - passes `settings.user` to all operations

## Solution

Remove `user` parameter from all API methods. Use `this.api.user` everywhere.

## Changes Required

### 1. trustgraph-client (../trustgraph-client)

**File: src/socket/trustgraph-socket.ts**

**CollectionManagement class:**
```typescript
// Before
listCollections(user: string, tagFilter?: string[])
updateCollection(user: string, collection: string, ...)
deleteCollection(user: string, collection: string)

// After
listCollections(tagFilter?: string[])
  // Use this.api.user internally
updateCollection(collection: string, ...)
  // Use this.api.user internally
deleteCollection(collection: string)
  // Use this.api.user internally
```

**Librarian class:**
```typescript
// Before
loadDocument(..., user: string)
addProcessing(..., user?: string, ...)

// After
loadDocument(...)
  // Use this.api.user internally
addProcessing(..., collection?: string, tags?: string[])
  // Use this.api.user internally, remove user param
```

### 2. trustgraph-react-state (this repo)

**File: src/state/collections.ts**

Remove all `settings.user` references:
```typescript
// Before
const { settings } = useSettings();
socket.collectionManagement().listCollections(settings.user)
socket.collectionManagement().updateCollection(settings.user, collection, ...)
socket.collectionManagement().deleteCollection(settings.user, collection)

// After
// No settings needed for user
socket.collectionManagement().listCollections()
socket.collectionManagement().updateCollection(collection, ...)
socket.collectionManagement().deleteCollection(collection)
```

**File: src/state/library.ts**

Remove `user` parameter from mutations:
```typescript
// Before
uploadFilesMutation({ files, params, mimeType, user, onSuccess })
  // passes user to loadDocument

// After
uploadFilesMutation({ files, params, mimeType, onSuccess })
  // loadDocument uses socket's user internally
```

```typescript
// Before
addProcessing(proc_id, id, flow, user, collection, tags)

// After
addProcessing(proc_id, id, flow, collection, tags)
```

### 3. Update explicit-parameters.md

Remove references to `user` parameter. Only `collection` needs to be passed explicitly.

**Hooks signatures:**
```typescript
// No user parameter needed anywhere
useLibrary({ collection: string })
useCollections()  // no params, user from socket
```

## Benefits

- Eliminates redundant parameter passing
- User is automatically available from socket context
- Cleaner API - one less parameter everywhere
- Prepares for future auth where user comes from authentication
- Settings object not needed for user identification

## Migration

Breaking changes across three repositories:
- **trustgraph-client**: API method signatures change
- **trustgraph-react-state**: Hook implementations change
- **Consumer applications**: No impact (hooks hide the change)

No migration strategy needed - breaking changes acceptable.
