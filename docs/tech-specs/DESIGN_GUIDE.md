# TrustGraph Toolkit — Design Guide

This document captures the visual language, interaction patterns, and
design philosophy of the TrustGraph UX. Where DESIGN_TOKENS.md lists raw
values, this guide explains when and why to use them.

---

## Design Philosophy

### Dark, technical, data-dense

The UX is designed for people working with knowledge graphs — analysts,
engineers, researchers. It prioritises information density over whitespace.
The dark theme reduces eye strain during long sessions and lets coloured
data elements (nodes, badges, status indicators) stand out.

### Minimal chrome, maximum content

UI controls are visually quiet — thin borders, low-contrast backgrounds,
subtle dividers. The interface recedes so the data is the focus. Controls
become visible through interaction (hover, selection) rather than
competing with content at rest.

### Colour carries meaning

Colour is never decorative. Every use of colour communicates something:
- **Domain colours** identify entity types across all views (graph,
  badges, filters, ontology cards)
- **Semantic colours** indicate status (success, error, warning, info)
  and message types (thinking, observation, answer)
- **Text colour hierarchy** establishes importance through brightness
  against the dark background

If something is coloured, the user should be able to understand why.

### Motion is purposeful

Animation is used sparingly and only when it aids comprehension:
- Graph nodes settle into position (shows the system is working)
- Highlighted edges pulse (draws attention to active relationships)
- Responses stream token-by-token (shows the LLM is generating)
- Toasts slide in (draws attention without blocking)

There are no decorative animations, loading spinners, or transitions
for transitions' sake.

---

## Typography

### Two families, distinct roles

**IBM Plex Sans** — the reading font. Used for body text, headings,
labels that the user reads as natural language. Sizes 12px and above.

**IBM Plex Mono** — the data font. Used for technical content: URIs,
property names, status labels, section headings (uppercase), metadata.
Typically 10–11px. The monospace face signals "this is structured data"
rather than prose.

### When to use which

| Context                         | Font         |
|---------------------------------|--------------|
| Body text, descriptions         | Sans         |
| Section labels (uppercase)      | Mono         |
| Property keys and values        | Mono         |
| Entity labels (in panels)       | Sans         |
| Entity labels (on graph nodes)  | Sans         |
| Status text, counts             | Mono         |
| Buttons, input text             | Sans         |
| URIs, IDs                       | Mono         |
| Table headers                   | Mono         |
| Toast messages                  | Sans         |
| Scores, percentages             | Mono         |

### Uppercase convention

Section labels use uppercase + wide letter-spacing (0.1em) + mono font
at 10px. This combination creates a distinct "section marker" that is
easily scannable without being visually heavy. Example: `AGENT QUERIES`,
`RELATED ENTITIES`, `ONTOLOGY SCHEMA`.

---

## Colour Usage

### Domain colours

Each entity type/class in the ontology is assigned a colour from the
palette. This colour is used consistently everywhere that entity type
appears:
- Node fill and glow on the graph
- Badge background and border
- Filter button accent
- Ontology card heading
- Relationship endpoint labels

The palette cycles: emerald → pink → blue → amber → purple → rose →
cyan → red. Assignment is deterministic — the same class always gets the
same colour.

### Text brightness hierarchy

On a dark background, text importance is communicated through brightness:

| Level     | Hex     | Usage                              |
|-----------|---------|-------------------------------------|
| Bright    | `#fff`  | Active tab, highlighted node label  |
| Primary   | `#ddd`  | Main content text                   |
| Secondary | `#bbb`  | Supporting text                     |
| Muted     | `#aaa`  | Less important labels               |
| Subtle    | `#888`  | Deemphasised text                   |
| Faint     | `#666`  | Very low priority, inactive tabs    |
| Disabled  | `#555`  | Disabled controls                   |
| Hint      | `#444`  | Placeholder text, empty states      |

Do not use colours between these steps. The fixed hierarchy ensures
consistent visual weight across all components.

### Opacity-based colour manipulation

Dynamic colours (domain colours applied to backgrounds, borders, and
glows) are created by appending hex alpha values to the base colour:

| Alpha | Opacity | Usage                              |
|-------|---------|-------------------------------------|
| `10`  | 6%      | Very faint background tints         |
| `15`  | 8%      | Subtle badge backgrounds            |
| `1a`  | 10%     | Button backgrounds                  |
| `22`  | 13%     | Card borders, light tints           |
| `35`  | 21%     | Selected badge backgrounds          |
| `44`  | 27%     | Borders, shadow glows               |
| `88`  | 53%     | Active borders                      |
| `cc`  | 80%     | Text on coloured backgrounds        |

This is preferred over separate colour definitions because it
automatically adapts to any domain colour.

---

## Interaction Patterns

### Hover

Hover provides preview and affordance, never structural change.

**Graph nodes:** Radius increases to 1.4×. Font size increases. A glow
effect appears. A tooltip shows the entity label and properties.
Cursor changes to pointer.

**Badges and buttons:** Background and border intensify. No size change.

**Data rows:** Background shifts to `surface.card` (very subtle).
No other change.

**Principle:** Hover effects are reversible visual hints. They never
move layout, open panels, or trigger data fetches.

### Selection

Selection is a committed state that changes what the user sees.

**Graph nodes:** Selected node and its connected neighbourhood highlight
at full opacity. All other nodes dim to 0.3 opacity. The detail panel
opens. The filter bar updates to show relevant domains.

**Badges:** Selected badge gets a visible border, brighter background,
and subtle glow shadow. Unselected badges have transparent borders and
very faint backgrounds.

**Tabs:** Active tab gets a white background tint and full-brightness
text. Inactive tabs recede to faint text with no background.

**Filters:** Active filter gets a coloured border and tinted background.
Other filters show default borders.

**Principle:** Selection always changes context — it filters, highlights,
or reveals information. The visual change should be proportional to the
scope of the context change.

### Click-through navigation

In the graph and detail panel, clicking a connected entity navigates
to it: the graph re-centres, the detail panel updates, and the highlight
shifts to the new neighbourhood. This lets users follow relationship
chains through the graph without a separate navigation mechanism.

### Zoom and pan

- **Zoom:** Mouse wheel, towards cursor position. Range: 0.25× to 4×.
  A zoom indicator appears in the corner when zoom is not 1×.
- **Pan:** Middle mouse button or Shift + left mouse. Cursor changes to
  `grabbing` during pan.
- **No zoom/pan buttons are required** but ZoomControls provides +/−
  buttons and a reset-to-fit button as an accessible alternative.

---

## Component Patterns

### Cards

Cards are the primary container for grouped content. They have:
- Rounded corners (12px default)
- Very faint background (`surface.card` at 2% white)
- Subtle border (`border.subtle` at 4% white)
- 24px padding by default
- Optional coloured border for domain association

Cards do not have shadows. Depth is communicated through background
opacity differences, not elevation.

### Panels

Side panels (like NodeDetailPanel) are overlays that share the viewport
with the main content:
- Fixed width (320px)
- Dark semi-transparent background with backdrop blur
- Separated from content by a 1px border
- Scrollable when content overflows
- Close button in top-right corner

Panels do not animate in or out. They appear and disappear instantly.
This is deliberate — animation would slow down rapid exploration.

### Tooltips

Graph tooltips appear on hover near the cursor:
- Dark background (`surface.overlay`) with backdrop blur (12px)
- Coloured border matching the hovered element
- Offset 20px from the element to avoid occlusion
- Non-interactive (`pointerEvents: none`)
- No arrow or tail pointing to the element

### Toasts

Notifications appear fixed to the bottom-left:
- Slide in from the left (0.2s ease-out)
- Left border coloured by type (success/error/warning/info)
- Icon in a small circle
- Auto-dismiss after 6 seconds (unless persistent)
- Maximum 4 visible; oldest displaced by newest
- Z-index 1000 (above everything)

### Filter bars

Horizontal bars of filter chips that scope the view:
- Pill-shaped buttons (20px radius)
- Active filter gets coloured border and tint
- Stats text right-aligned (e.g. "142 entities · 89 relationships")
- Horizontally scrollable if needed

---

## Layout Principles

### Content owns its height

Views calculate their own height using `calc(100vh - Npx)` where N
accounts for the header and any toolbars. This ensures the graph canvas,
scroll areas, and panels fill the available space without page-level
scroll.

### Split panes

Views that combine a primary area with a detail panel use flexbox:
- Primary content: `flex: 1, minWidth: 0`
- Detail panel: fixed width, conditional render
- The primary area absorbs width changes when the panel opens/closes

### Consistent horizontal margins

Page-level horizontal padding is 28px throughout. This applies to
section padding, filter bars, input areas, and result lists. Nested
cards and panels use their own internal padding (typically 24px or
16px).

---

## State Communication

### Loading

Loading is communicated through text, not animation:
- `LoadingState` component: centered muted text ("Loading...")
- Input buttons: text changes to "..." and button disables
- Status bar: amber hollow circle (`◌`) with activity description

No spinners, skeletons, or progress bars are used in the current
components. Progress bars should be introduced for operations with
known duration (uploads, exports) but not for indeterminate waits.

### Empty states

Empty states use italic muted text (hint colour, 13px):
- "Type your question to get started."
- "No related concepts found"
- "Select a node to filter"
- "Graph will populate as explain events arrive"

Empty states are informational, not decorative. No illustrations or
icons.

### Errors

Errors are communicated through:
- `LoadingState` with `variant="error"` (red text)
- Error toasts (red left border, ✕ icon)
- Status bar connection status (red dot)

Errors should be actionable where possible — include what went wrong,
not just that something failed.

### Streaming/progress

Real-time operations show incremental progress:
- LLM responses stream token-by-token (Typewriter component)
- Explain events appear one at a time as they arrive
- The provenance graph builds progressively

This gives the user confidence the system is working without requiring
explicit progress indicators.

---

## Graph Visual Language

### Node representation

- Circular nodes with domain colour fill
- Radius proportional to a base size (not data-driven currently)
- Label rendered adjacent to the node in sans font
- On highlight: glow effect (radial gradient from node colour to
  transparent), radius pulse (sinusoidal, subtle)

### Edge representation

- Curved lines (quadratic Bezier) between nodes
- Low opacity at rest (0.2–0.35)
- Higher opacity on highlight (0.7–0.8)
- Predicate labels at curve midpoint, very small font, low opacity
- Highlighted edges show animated particles travelling along the curve
  (small white dots following the Bezier path)

### Dimming

When any node is selected or highlighted, all non-relevant nodes dim:
- Highlighted: full opacity (1.0)
- Connected to highlighted: full opacity
- Everything else: 0.3 opacity
- Filtered out: 0.15 opacity

This creates a focus effect without removing context — the user can
still see the full graph but attention is drawn to the relevant
subgraph.

### Background grid

The graph canvas has a subtle grid pattern:
- Grid spacing: 60px (canvas) or 30px (SVG)
- Grid colour: `border.grid` (1.5% white) — barely visible
- Purpose: provides spatial reference during pan/zoom without
  visual noise

---

## Accessibility Notes

### Current state

- Interactive elements use `cursor: pointer`
- Disabled states use `cursor: not-allowed` and dimmed colours
- Colour is supplemented by icons for status (✓, ✕, !, i)
- Toasts have icons alongside colour coding

### Gaps to address

- No ARIA labels on graph nodes or interactive elements
- No keyboard navigation for graph exploration
- No focus indicators (outline/ring) on interactive elements
- Colour contrast ratios for muted text levels may not meet WCAG AA
- No screen reader announcements for state changes
- Toast auto-dismiss has no pause-on-hover

These should be addressed as the toolkit matures (see TOOLKIT_VISION.md
accessibility requirements).
