# Chat State Refactoring

## Problem

Current architecture couples text completion services with conversation management, making them inseparable:

- `chat.ts`: Zustand store with basic state (messages, input, chatMode)
- `chat-query.ts`: TanStack Query hook (`useChat`) that does everything - API calls, message management, activity tracking, entity updates
- Users must use both hooks together; cannot access text completion services independently
- Naming is confusing: `useChatStateStore` vs `useChat`

## Solution

Split into three decoupled hooks with clear responsibilities:

### 1. useConversation (conversation.ts)

Manages conversation state and UI interactions.

**State:**
- messages array
- input text
- chat mode (graph-rag, agent, basic-llm)

**Operations:**
- setMessages, addMessage
- setInput
- setChatMode

**Implementation:** Zustand store combining current `useChatStateStore` with message management logic

### 2. useInference (inference.ts)

Provides low-level access to LLM inference services.

**Returns three functions:**
- `graphRag(input, options)` - Graph RAG completion with entity discovery
- `textCompletion(systemPrompt, input)` - Basic LLM completion
- `agent(input, callbacks)` - Agent with streaming (think, observe, answer, error)

**No dependencies on:** conversation state, progress tracking, notifications, entity management

**Implementation:** TanStack Query mutations wrapping socket API calls

### 3. useChatSession (chat-session.ts)

High-level integration for full-featured chat UIs.

**Responsibilities:**
- Combines useConversation + useInference
- Routes messages based on chat mode
- Manages progress activities
- Updates workbench entities (for graph-rag mode)
- Handles notifications
- Clears input on submit

**Returns:**
- submitMessage function
- isSubmitting status
- submitError

**Implementation:** Current `useChat` logic, but composing the two lower-level hooks

## Implementation

**Files:**
- `chat.ts` → `conversation.ts` (expand with message operations)
- Create `inference.ts` (extract API calls)
- `chat-query.ts` → `chat-session.ts` (compose the two)
- Update exports in `index.ts`
- Update tests

**Breaking changes:**
- `useChatStateStore` → `useConversation`
- `useChat` → `useChatSession` (also re-exported as `useChat` for convenience)

No migration strategy needed - breaking changes are acceptable.

## Benefits

- LLM inference services usable independently
- Clear separation of concerns
- Better testability
- Simpler naming conventions
- Non-chat UIs can use inference without conversation machinery
