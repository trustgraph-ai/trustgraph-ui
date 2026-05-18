# Testing TrustGraph Client Streaming

This guide explains how to test the new streaming functionality added in v1.0.0.

## Prerequisites

1. **TrustGraph Backend Running**: Ensure the TrustGraph backend is running on `http://localhost:8088`
2. **Built Client**: Run `npm run build` to build the client library

## Test Files

### 1. Node.js Test (`test-streaming.js`)

A command-line test script that demonstrates both streaming and non-streaming text completion.

**Run:**
```bash
node test-streaming.js
```

**What it tests:**
- Non-streaming text completion (shows full response at once)
- Streaming text completion (shows chunks arriving in real-time)
- Performance comparison (time to first byte, total duration)

**Expected output:**
```
================================================================================
TrustGraph Streaming API Test
================================================================================
Connecting to: ws://localhost:8088/api/socket
User: test-user
================================================================================

[1/2] Testing NON-STREAMING text completion...
--------------------------------------------------------------------------------
✓ Non-streaming response received:
Streaming is a method of...

[2/2] Testing STREAMING text completion...
--------------------------------------------------------------------------------
Streaming is a method of... (chunks appear progressively)
--------------------------------------------------------------------------------
✓ Streaming complete!
  Chunks received: 15
  Total length: 234 chars
  Duration: 1523ms
  First chunk: ~101ms
```

### 2. Browser Test (`test-streaming.html`)

An interactive HTML page for testing streaming in the browser.

**Run:**

Option 1 - Direct file open:
```bash
# Open the file directly in your browser
open test-streaming.html  # macOS
xdg-open test-streaming.html  # Linux
```

Option 2 - Local server (recommended):
```bash
# Python 3
python3 -m http.server 8000
# Then open: http://localhost:8000/test-streaming.html

# Or Node.js
npx http-server -p 8000
# Then open: http://localhost:8000/test-streaming.html
```

**Features:**
- Visual connection status indicator
- Two test buttons (non-streaming and streaming)
- Real-time chunk display with visual feedback
- Performance metrics (time to first byte, chunk count, duration)
- Error handling with visual feedback

## Configuration

Both test files can be configured by editing the constants at the top:

```javascript
const USER = "test-user";
const SYSTEM_PROMPT = "You are a helpful AI assistant.";
const TEST_PROMPT = "Explain what streaming is in one paragraph.";
const SOCKET_URL = "ws://localhost:8088/api/socket";  // Node.js only
```

## Troubleshooting

### "Connection failed" or "Invalid URL"

**Node.js:**
- Make sure you're passing the full WebSocket URL: `ws://localhost:8088/api/socket`
- The client requires an absolute URL in Node.js (relative URLs only work in browsers)

**Browser:**
- Check that the backend is running on port 8088
- Open browser DevTools and check the Console for error messages
- Verify the WebSocket connection in the Network tab

### "Socket not ready"

- The client needs a moment to establish the WebSocket connection
- The test scripts wait 1 second before making requests
- If you still see this error, increase the wait time

### "No chunks received"

- Verify the backend has `streaming: true` enabled for the service
- Check backend logs for errors
- Try the non-streaming version first to verify basic connectivity

## What Changed in v1.0.0

### Breaking Changes

**Agent API**: Callbacks now receive `(chunk: string, complete: boolean)` instead of full messages:

```javascript
// OLD (v0.3.0)
flowApi.agent(
  "question",
  (thought) => console.log(thought),          // Full thought
  (observation) => console.log(observation),  // Full observation
  (answer) => console.log(answer),            // Full answer
  (error) => console.error(error)
);

// NEW (v1.0.0)
let currentThought = "";
flowApi.agent(
  "question",
  (chunk, complete) => {
    currentThought += chunk;
    if (complete) console.log("Thought:", currentThought);
  },
  (chunk, complete) => { /* observation */ },
  (chunk, complete) => { /* answer */ },
  (error) => console.error(error)
);
```

### New Features

**Streaming Methods Added:**
- `textCompletionStreaming()`
- `graphRagStreaming()`
- `documentRagStreaming()`
- `promptStreaming()`

All use the same callback pattern:
```javascript
flowApi.textCompletionStreaming(
  systemPrompt,
  userPrompt,
  (chunk, complete) => {
    // Handle each chunk
    // complete === true on final chunk
  },
  (error) => {
    // Handle errors
  }
);
```

## Further Testing

To test other streaming services:

**Graph RAG:**
```javascript
flowApi.graphRagStreaming(
  "What is machine learning?",
  (chunk, complete) => { /* ... */ },
  (error) => { /* ... */ },
  { entityLimit: 50 },  // options
  "default"             // collection
);
```

**Document RAG:**
```javascript
flowApi.documentRagStreaming(
  "Explain neural networks",
  (chunk, complete) => { /* ... */ },
  (error) => { /* ... */ },
  10,        // docLimit
  "default"  // collection
);
```

**Agent (updated):**
```javascript
flowApi.agent(
  "What is AI?",
  (chunk, complete) => { /* thought chunks */ },
  (chunk, complete) => { /* observation chunks */ },
  (chunk, complete) => { /* answer chunks */ },
  (error) => { /* errors */ }
);
```
