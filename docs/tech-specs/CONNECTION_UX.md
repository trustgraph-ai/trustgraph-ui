# TrustGraph Toolkit — Connection & Settings UX

This document specifies how users configure TrustGraph connections,
covering both the UX design and the underlying architecture.

---

## Connection Parameters

A TrustGraph connection requires:

| Parameter    | Required | Purpose                          | Example                          |
|------------- |----------|----------------------------------|----------------------------------|
| `name`       | Yes      | Human label for this connection  | "Production", "Local Dev"        |
| `url`        | Yes      | WebSocket endpoint               | `wss://api.trustgraph.ai/socket` |
| `user`       | Yes      | User identifier                  | `alice@company.com`              |
| `apiKey`     | No       | Authentication token             | `tg_sk_...`                      |

The URL defaults to `/api/socket` (same-origin) for apps served from a
TrustGraph deployment. For remote or multi-instance setups, the full
URL is needed.

---

## UX Design

### Principle: no wall before the content

The settings page is not a gate. If a connection is already configured
(from a previous session or from defaults), the app loads straight into
the main experience. Settings are always accessible but never forced
on the user unless there's genuinely no connection.

### First-run experience

On first launch with no saved connection:

1. The app shows a **welcome/connect screen** — not a blank page with
   a buried settings link. This screen is focused and minimal:

   ```
   ┌──────────────────────────────────────────┐
   │                                          │
   │          Connect to TrustGraph           │
   │                                          │
   │   URL     [wss://........................]│
   │   User    [................................]│
   │   API Key [................................]│ (optional)
   │                                          │
   │              [ Connect ]                 │
   │                                          │
   │   ○ Connected   ○ Authenticated          │
   │                                          │
   └──────────────────────────────────────────┘
   ```

2. The user fills in URL, username, and optionally an API key.

3. On clicking **Connect**, the system attempts connection immediately.
   Live feedback shows:
   - `○ Connecting...` (amber)
   - `● Connected` (green) — socket is open
   - `● Authenticated` (green) — if apiKey was provided and accepted
   - `✕ Connection failed` (red) — with reason (timeout, refused,
     invalid URL)
   - `✕ Authentication failed` (red) — bad API key

4. On successful connection, the screen transitions to the main app.
   The connection is saved to localStorage for next session.

### Connection indicator

A small connection indicator is always visible in the status bar /
header area. It shows:
- Connection name
- Status dot (green = connected, amber = reconnecting, red = failed)
- Click to open settings

This is the permanent, unobtrusive access point to connection settings.

### Settings page

Accessible from the connection indicator or a settings icon. The
settings page manages connections and other preferences.

#### Connection management

The settings page shows all saved connections as cards:

```
┌─────────────────────────────────────────────────────┐
│ CONNECTIONS                                         │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ● Production                        [Active]    │ │
│ │   wss://api.trustgraph.ai/socket                │ │
│ │   alice@company.com                             │ │
│ │   API Key: ●●●●●●●●                            │ │
│ │                                                 │ │
│ │   [Edit]  [Disconnect]  [Delete]                │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ○ Local Dev                                     │ │
│ │   ws://localhost:8088/api/v1/socket              │ │
│ │   trustgraph                                    │ │
│ │   API Key: none                                 │ │
│ │                                                 │ │
│ │   [Edit]  [Connect]  [Delete]                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [ + Add Connection ]                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Key interactions:

- **Add Connection** — opens the connection form (same as first-run
  but inline).
- **Edit** — inline edit of connection parameters. Changes take effect
  on save. If the connection is active, it reconnects.
- **Connect / Disconnect** — switch active connection. Only one
  connection is active per channel (but multiple channels can have
  different active connections).
- **Delete** — removes saved connection. Confirms if it's the active
  connection.
- **API Key display** — always masked. A "show" toggle reveals it.
  Copy button for convenience.

#### Connection form

The edit/add form appears inline (not a modal):

```
┌─────────────────────────────────────────────────────┐
│ Name       [ Production                           ] │
│ URL        [ wss://api.trustgraph.ai/socket       ] │
│ User       [ alice@company.com                    ] │
│ API Key    [ ●●●●●●●●●●●●●●●●          ] [Show]    │
│                                                     │
│ Connection test:                                    │
│   ● Socket: Connected                              │
│   ● Auth: Authenticated                            │
│                                                     │
│ [ Save ]  [ Cancel ]                                │
└─────────────────────────────────────────────────────┘
```

- **Live connection test** runs as the user types (debounced). The
  user sees connection status update in real time without clicking a
  test button.
- **URL field** auto-detects protocol. Typing `api.trustgraph.ai`
  suggests `wss://api.trustgraph.ai/api/v1/socket`.
- **API Key field** is a password input with show/hide toggle.
- **Validation** is inline — red border and error text on individual
  fields, not a banner.

#### Live connection test behaviour

The connection test is not a separate action — it runs continuously
as the form is filled in:

1. URL entered → attempt socket connection → show socket status
2. User entered → (socket already open, user sent with requests)
3. API Key entered → re-authenticate → show auth status

Status transitions shown to the user:
- Empty URL: no status shown
- Valid URL, connecting: `○ Connecting...` (amber)
- Connected: `● Socket: Connected` (green)
- Connection refused: `✕ Socket: Connection refused` (red)
- Timeout: `✕ Socket: Timed out` (red)
- Invalid URL: `✕ Socket: Invalid URL` (red, instant, no attempt)
- Auth success: `● Auth: Authenticated` (green)
- Auth failure: `✕ Auth: Invalid API key` (red)
- No API key: `○ Auth: No API key (unauthenticated mode)` (neutral)

This gives the user immediate confidence that their settings work
without a separate "test connection" step.

---

## Persistence

### What is saved

Connection settings are saved to localStorage:
- Connection name, URL, user
- API key (encrypted or omitted — see Security below)
- Last active connection per channel
- Last used collection per connection

### What is not saved

- Cached entity/triple data (lives in memory, managed by channels)
- Session tokens (if the auth model changes to sessions)

### Restore on reload

On page load:
1. Read saved connections from localStorage
2. Restore the last active connection for each channel
3. Connect automatically
4. If connection fails, show the connection indicator as red but
   don't force the settings page — the user might be offline
   temporarily

---

## Security Considerations

### API key storage

API keys in localStorage are accessible to any JavaScript on the page.
Options (in order of increasing security):

1. **Store in localStorage as-is** — simplest. Acceptable for internal
   tools and development. The key is visible in browser devtools.

2. **Store in localStorage, encrypted with a user-provided passphrase**
   — user enters a passphrase on first load, key is decrypted in
   memory. Passphrase not stored. Protects against casual inspection
   but not determined attackers.

3. **Don't store at all** — user enters the API key each session. Most
   secure but worst UX.

4. **Use a session cookie** — the API key is exchanged for a session
   token server-side. The token is stored in an httpOnly cookie. Best
   security but requires server-side changes.

Recommendation: start with option 1, flag it clearly in the UI
("API key is stored in your browser"), and design the storage layer so
options 2–4 can be swapped in later without changing the settings UX.

### API key masking

- Always display as `●●●●●●●●` by default
- Show/hide toggle to reveal
- Copy button that works without revealing
- Never log API keys to console

---

## Relationship to Channels

Connections and channels are related but separate concepts:

- A **connection** is a saved set of credentials (URL, user, apiKey)
- A **channel** is a runtime data context (connection + collection +
  cached state)

One connection can be used by multiple channels (each with a different
collection). The settings page manages connections. Channel assignment
happens in app code or through the collection picker.

```
Connection "Production"
├── Channel "sales"      (collection: "sales-data")
├── Channel "research"   (collection: "research-q4")
└── Channel "default"    (collection: "main")
```

When a connection is edited and saved, all channels using that
connection reconnect with the new parameters.

---

## Components Required

### Hooks

#### useConnections `[new]`
CRUD for saved connections. Persists to localStorage.

Returns `{ connections, addConnection, updateConnection,
deleteConnection, activeConnectionId, setActiveConnection }`.

#### useConnectionTest `[new]`
Live connection testing. Given connection parameters, attempts to
connect and reports status in real time.

| Arg | Type | Purpose |
|-----|------|---------|
| `url` | `string` | WebSocket URL |
| `user` | `string` | Username |
| `apiKey` | `string` | Optional API key |

Returns `{ socketStatus, authStatus, isConnecting, error }`.

### Domain Pieces

#### ConnectionCard `[new]`
Displays a saved connection with status, masked credentials, and
actions.

| Prop | Type | Purpose |
|------|------|---------|
| `connection` | `SavedConnection` | Connection data |
| `isActive` | `boolean` | Currently connected |
| `status` | `ConnectionStatus` | Live status |
| `onEdit` | `() => void` | Edit handler |
| `onConnect` | `() => void` | Activate handler |
| `onDisconnect` | `() => void` | Deactivate handler |
| `onDelete` | `() => void` | Delete handler |

Composes Card + StatusIndicator.

#### ConnectionForm `[new]`
Form for creating/editing a connection with live testing.

| Prop | Type | Purpose |
|------|------|---------|
| `connection` | `SavedConnection \| null` | Existing or new |
| `onSave` | `(connection: SavedConnection) => void` | Save handler |
| `onCancel` | `() => void` | Cancel handler |

Composes FormField + TextInput + StatusIndicator.

#### ConnectionStatusBadge `[new]`
Compact status indicator for the header/status bar. Shows connection
name and coloured dot.

| Prop | Type | Purpose |
|------|------|---------|
| `name` | `string` | Connection name |
| `status` | `ConnectionStatus` | Current status |
| `onClick` | `() => void` | Open settings |

#### MaskedField `[new]`
Text display that masks sensitive values with show/hide toggle and
copy button.

| Prop | Type | Purpose |
|------|------|---------|
| `value` | `string` | The sensitive value |
| `maskChar` | `string` | Mask character (default `●`) |
| `visibleChars` | `number` | Chars to show at end (0 = fully masked) |
| `copyable` | `boolean` | Show copy button |

### Composites

#### WelcomeScreen `[new]`
First-run connection setup. Shown when no connection is configured.
Wires ConnectionForm + live status.

| Prop | Type | Purpose |
|------|------|---------|
| `onConnected` | `() => void` | Successful connection |

#### ConnectionSettings `[new]`
Full connection management view — list of connections, add/edit/delete.
Wires useConnections + ConnectionCard + ConnectionForm.

### Integration with TrustGraphProvider

The `TrustGraphProvider` reads from `useConnections` on mount to
restore saved connections. It exposes connection management alongside
channel management:

```tsx
const {
  // Channel management
  createChannel, resetChannel, destroyChannel,
  // Connection management
  connections, activeConnection, switchConnection,
} = useTrustGraph();
```
