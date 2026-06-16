# Retail Demo — UX Flow Design

## Entry Points

```
[Browse Catalog]          [Activity Selector]         [Promotion/Deal]
 "show me GPUs"            "Build a Gaming PC"         "RTX 4070 Ti — 15% off"
 "what camping gear        "Plan a Camping Trip"       "Summer camping bundle"
  do you have?"            "Set up Home Office"
                                                      
      │                         │                          │
      ▼                         ▼                          ▼
 Free browsing            Guided workflow              Product landing
 (chat + catalog)         (structured form)            (single product/bundle)
      │                         │                          │
      │    ┌────────────────────┘                          │
      │    │  "I see you're looking at GPUs —              │
      │    │   want help building a full PC?"              │
      ▼    ▼                                               │
 ┌─────────────────┐                                       │
 │  CROSS-SELL     │◄──────────────────────────────────────┘
 │  SUGGESTION     │  "This GPU is on sale — want to
 │                 │   build a system around it?"
 └────────┬────────┘
          │ accept
          ▼
```

## Configure (structured)

```
┌──────────────────────────────────────────────────┐
│  What are you building?    [Gaming PC ▾]         │
│  Budget?                   [$1500      ]         │
│  Target?                   [1440p gaming ▾]      │
│  Constraints?              [AMD only] [no pref]  │
│                                                  │
│              [ Generate Build → ]                │
└──────────────────────────────────────────────────┘
```

## Recommend (agent + resolve)

Agent picks components → SPARQL resolves → constraint check.

```
┌─ BUILD PANEL ──────────────────────────────────────┐
│  CPU    [Ryzen 7 7800X3D     ] $449  ✓ compatible  │
│  GPU    [RTX 4070 Ti Super   ] $799  ✓ compatible  │
│  MB     [ASUS TUF B650-PLUS  ] $199  ✓ socket OK   │
│  RAM    [Corsair DDR5 32GB   ] $109  ✓ type OK     │
│  SSD    [Samsung 990 Pro 1TB ] $129  ✓ NVMe OK     │
│  PSU    [Corsair RM850x      ] $139  ✓ 850W OK     │
│  Case   [Fractal North       ] $139  ✓ clearance   │
│  ─────────────────────────────────────             │
│  Total: $1,963    Budget: $1,500    OVER $463      │
│                                                    │
│  ⚠ Bottleneck: none detected                      │
│  ✓ All constraints pass                            │
└────────────────────────────────────────────────────┘
```

### Slot interactions

- **Click any slot** → show alternatives. Agent suggests 2–3
  options → user picks one → rebuild validates → back to build panel.
- **Over budget** → budget rebalance. Agent downgrades
  lowest-impact slots → back to build panel.

## Refine (iterative)

```
UPSELL
"This build is solid at 1440p. For $200 more you could upgrade
 to the RTX 4080 and get 4K capable. Worth it?"
                        [Upgrade GPU]  [Keep build]

CROSS-SELL
"You're building a gaming PC — would you also like to see our
 streaming gear? A headset + stream deck would pair well."
                    [Show me]  [No thanks]

DOWNGRADE
"If you're mainly playing at 1080p, you could save $200 by
 going with the RTX 4070 instead."
                   [Downgrade]  [Keep 4070 Ti]
```

## Complete

```
┌──────────────────────────────────────────────────────┐
│  ✓ Build complete — all slots filled                 │
│  ✓ All constraints pass                              │
│  ✓ Within budget                                     │
│                                                      │
│  Total: $1,479 / $1,500 budget                       │
│                                                      │
│  [ Add all to cart ]     [ Save build ]              │
│  [ Share build link ]    [ Start new build ]         │
└──────────────────────────────────────────────────────┘
```

## Parallel Paths (non-PC)

### Gift Finder

1. Who is it for? `[teenager, into gaming]` Budget: $100
2. Agent suggests 3 options across categories
3. User reacts: `[love it]` `[already has]` `[not quite]`
4. Refined suggestions
5. "Pair with this?" (accessory cross-sell)
6. Add to cart

### Kit Assembly

1. What activity? (Camping)
2. Scenario details: `[car camping, 3 people, July, Yosemite]` Budget: $500
3. Agent fills categories from activity template
4. Checklist view:
   - ✓ Sleep (essential)
   - ✓ Cooking (recommended)
   - ○ Comfort (optional)
5. Adjust quantities, swap items, budget fit
6. Cross-sell: "You'll need propane for that stove"
7. Add collection to cart

## State Model

The frontend owns the state machine. The agent is an advisor, not a
controller — it is called at specific points to make recommendations,
but the frontend drives transitions and validates everything via SPARQL.

Chat stays available throughout as a sidecar — "why did you pick this
motherboard?" / "what if I want Wi-Fi?" — but it reads from and writes
to the same build state, it doesn't own it.

```
{
  phase: "configure" | "recommend" | "refine" | "complete"
  activity: ActivityTemplate          // from graph
  budget: number
  target: string                      // "1440p gaming"
  constraints: string[]               // "AMD only"
  slots: {
    [slotType]: {
      product: Product | null         // resolved from graph
      locked: boolean                 // user locked this choice
      alternatives: Product[]         // agent-suggested swaps
    }
  }
  validationResult: {
    hardFailures: ConstraintViolation[]
    softWarnings: ConstraintViolation[]
  }
  crossSells: CrossSellSuggestion[]   // pending suggestions
}
```

## LLM Round-Trip: State Machine Model

The LLM is a *decision engine*, not a product database. It reads the
conversation state and outputs *instructions* that the frontend
executes. The knowledge graph does the heavy lifting for product data.
The LLM never needs to name a specific product.

### Why not the agent framework?

The agent framework (ReAct loop with tool calls) is powerful for
open-ended reasoning, but the structured workflow doesn't need it.
We don't need the agent to look up a CPU — that's in the knowledge
graph. We need the LLM to decide *when* to show CPU recommendations
and *what parameters* to filter by.

The agent framework is still used for freeform "why" questions where
the user wants the LLM to reason over the graph. But the structured
workflow uses plain text completion with a tight system prompt — it's
faster, more predictable, and the output is parseable.

### Input (frontend constructs)

The frontend sends the full conversation context as a JSON object:

```json
{
  "history": [
    { "role": "user", "text": "I want to build a gaming PC" },
    { "role": "assistant", "text": "Great! What's your budget?" },
    { "role": "user", "text": "About $1500, mainly for 1440p gaming" }
  ],
  "state": {
    "activity": null,
    "budget": null,
    "target": null,
    "slots": {}
  }
}
```

### Output (LLM returns JSON)

The LLM returns a message (shown to the user) and a list of actions
(executed by the frontend):

```json
{
  "message": "Great, $1500 is a solid budget for 1440p gaming. Let's start with the GPU — it's the anchor for a gaming build.",
  "actions": [
    { "action": "set-activity", "value": "GamingPCBuild" },
    { "action": "set-budget", "value": 1500 },
    { "action": "set-target", "value": "1440p" },
    { "action": "recommend", "slot": "gpu",
      "parameters": {
        "category": "GraphicsCardCategory",
        "max-price": 750,
        "min-performance-tier": "High-end",
        "sort": "performance-score-desc"
      }
    }
  ]
}
```

### Frontend executes

1. Apply state changes (activity, budget, target)
2. Run SPARQL with the recommend parameters
3. Display GPU options to user
4. Show message in chat

The LLM never saw a product name. The graph did the work.

### Action Vocabulary

**State actions** (mutate the build state):

| Action | Description |
|--------|-------------|
| `set-activity` | Pick the activity template |
| `set-budget` | Set or adjust budget |
| `set-target` | Set performance target |
| `set-constraint` | Add a preference ("AMD only") |
| `lock-slot` | User committed to this choice |
| `clear-slot` | Remove a component |

**Display actions** (tell the UI what to show):

| Action | Description |
|--------|-------------|
| `recommend` | Show product options for a slot, with query parameters the frontend turns into SPARQL |
| `compare` | Show side-by-side for N products in a slot |
| `upsell` | Suggest a higher-tier option for a filled slot, with rationale |
| `cross-sell` | Suggest a related category ("you might also want streaming gear") |
| `explain` | Answer a "why" question, no state change |

**Flow actions** (move through the workflow):

| Action | Description |
|--------|-------------|
| `advance-phase` | Move to next phase (configure → recommend → refine → complete) |
| `validate` | Trigger constraint check on current build |
| `rebalance` | Signal that budget is exceeded, suggest which slots to downgrade |

### System Prompt

```
You are a retail assistant state machine.

You receive: conversation history + current build state.
You return: a JSON object with "message" (shown to user)
and "actions" (executed by the frontend).

You NEVER name specific products. You describe what the
user needs in terms of categories, price ranges,
performance tiers, and constraints. The frontend queries
the product catalog.

You DO decide: workflow pacing (when to ask clarifying
questions vs move forward), which slot to fill next,
what budget allocation makes sense, when to suggest
cross-sells, when the build is complete.
```

### Failure Handling

| Failure | Response |
|---------|----------|
| LLM returns invalid JSON | Show message text if parseable, ignore actions, retry once |
| Recommend parameters match zero products | Widen parameters (remove price cap or tier filter), re-query |
| Constraint violation after slot fill | Display the violation in the build panel, auto-prompt LLM with the error for a corrective action |
| LLM suggests action on nonexistent slot | Ignore the action, log it, continue with valid actions |

### Example Round-Trips

**User selects a GPU from recommendations:**

```json
INPUT:
{
  "history": [
    ...previous messages,
    { "role": "user", "text": "I'll take the RTX 4070 Ti Super" }
  ],
  "state": {
    "activity": "GamingPCBuild",
    "budget": 1500,
    "target": "1440p",
    "slots": {
      "gpu": { "product": "NVIDIA GeForce RTX 4070 Ti Super",
               "price": 799, "locked": false }
    }
  }
}

OUTPUT:
{
  "message": "Good choice — the 4070 Ti Super is excellent for 1440p. Now let's pick a CPU. For gaming, single-thread performance matters most.",
  "actions": [
    { "action": "lock-slot", "slot": "gpu" },
    { "action": "recommend", "slot": "cpu",
      "parameters": {
        "category": "ProcessorCategory",
        "max-price": 500,
        "sort": "performance-score-desc"
      }
    }
  ]
}
```

**Build is over budget:**

```json
INPUT:
{
  "history": [...],
  "state": {
    "activity": "GamingPCBuild",
    "budget": 1500,
    "slots": {
      "cpu": { "product": "...", "price": 449, "locked": false },
      "gpu": { "product": "...", "price": 799, "locked": true },
      "motherboard": { "product": "...", "price": 199, "locked": false },
      "ram": { "product": "...", "price": 109, "locked": false },
      "storage": { "product": "...", "price": 129, "locked": false },
      "psu": { "product": "...", "price": 139, "locked": false },
      "case": { "product": "...", "price": 139, "locked": false }
    },
    "total": 1963,
    "overBudget": 463
  }
}

OUTPUT:
{
  "message": "You're $463 over budget. The GPU is locked, so let's look at the CPU — dropping to a mid-range option saves the most without hurting 1440p gaming much.",
  "actions": [
    { "action": "recommend", "slot": "cpu",
      "parameters": {
        "category": "ProcessorCategory",
        "max-price": 250,
        "min-performance-tier": "Mid-range",
        "sort": "price-asc"
      }
    },
    { "action": "rebalance" }
  ]
}
```

**Cross-sell after build complete:**

```json
INPUT:
{
  "history": [...],
  "state": {
    "phase": "complete",
    "activity": "GamingPCBuild",
    "budget": 1500,
    "total": 1479,
    "allConstraintsPass": true
  }
}

OUTPUT:
{
  "message": "Your build is complete and under budget! Since you're set up for gaming, would you like to see our streaming and audio gear? A headset and stream deck would complement this setup nicely.",
  "actions": [
    { "action": "cross-sell",
      "category": "Electronics",
      "reason": "gaming-accessories",
      "budget-remaining": 21
    }
  ]
}
```

## Prompt Template: `retail-assistant`

Stored in config service as `template.retail-assistant`. Uses ibis (Jinja)
syntax. Response type is `json` with a schema enforcing the action vocabulary.

### Template

```jinja
You are a retail shopping assistant state machine.

You receive a conversation history, the user's latest message, and the
current build/shopping state. You return a JSON object with two fields:
"message" (shown to the user) and "actions" (executed by the frontend).

## Rules

- NEVER name specific products. Describe what the user needs in terms of
  categories, price ranges, performance tiers, and constraints.
- DO decide: workflow pacing, which slot to fill next, budget allocation,
  when to suggest cross-sells, when the build is complete.
- Keep messages concise — 1-2 sentences. Be helpful but not verbose.
- Return at least one action per response. If the user is just chatting,
  use "explain" with no state change.
- When the user's intent is ambiguous, ask a clarifying question (message
  only, no actions beyond "explain").

## Action vocabulary

State actions: set-activity, set-budget, set-target, set-constraint,
  lock-slot, clear-slot
Display actions: recommend (with query parameters), compare, upsell,
  cross-sell, explain
Flow actions: advance-phase, validate, rebalance

## Current state

- **Phase**: {{ phase }}
- **Activity**: {{ activity }}
- **Budget**: ${{ budget }}
- **Target**: {{ target }}
{% if constraints %}- **Constraints**:
{% for c in constraints %}  - {{ c }}
{% endfor %}{% endif %}

{% if has_slots %}## Current build

| Slot | Product | Price | Locked |
|------|---------|-------|--------|
{% for s in slots %} | {{ s.name }} | {{ s.product }} | ${{ s.price }} | {{ s.locked }} |
{% endfor %}
- **Total**: ${{ total }}
{% if over_budget > 0 %}- **Over budget by**: ${{ over_budget }}
{% endif %}- **All constraints pass**: {{ all_constraints_pass }}
{% endif %}

## Conversation

{% for msg in messages %}**{{ msg.role }}**: {{ msg.text }}
{% endfor %}

## Latest message

**user**: {{ user_message }}

Respond with a JSON object: { "message": "...", "actions": [...] }
```

### Response schema

```json
{
  "type": "object",
  "properties": {
    "message": { "type": "string" },
    "actions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "action": {
            "type": "string",
            "enum": [
              "set-activity", "set-budget", "set-target", "set-constraint",
              "lock-slot", "clear-slot",
              "recommend", "compare", "upsell", "cross-sell", "explain",
              "advance-phase", "validate", "rebalance"
            ]
          },
          "slot": { "type": "string" },
          "value": {},
          "parameters": { "type": "object" },
          "category": { "type": "string" },
          "reason": { "type": "string" }
        },
        "required": ["action"]
      }
    }
  },
  "required": ["message", "actions"]
}
```

### Hook: `useRetailPrompt`

The `useRetailPrompt` hook wraps `promptStreaming` with retail-specific
variable construction. It passes structured objects — not serialized
JSON — so the template can iterate over them with `{% for %}` blocks.

Variables passed:

| Variable | Type | Template usage |
|----------|------|----------------|
| `messages` | `{role, text}[]` | `{% for msg in messages %}` |
| `slots` | `{name, product, price, locked}[]` | `{% for s in slots %}` |
| `constraints` | `string[]` | `{% for c in constraints %}` |
| `has_slots` | `boolean` | `{% if has_slots %}` |
| `phase`, `activity`, `budget`, `target` | scalars | `{{ phase }}` |
| `total`, `over_budget`, `all_constraints_pass` | scalars | `{{ total }}` |
| `user_message` | `string` | `{{ user_message }}` |

The frontend calls `send(userText, history, buildState)` and receives
a parsed `RetailLLMResponse` with `message` and `actions[]` when complete.

## Architecture Principles

- **LLM is a decision engine, not a product database.** It decides
  *what to show* and *when*. The knowledge graph provides *what
  exists*. The frontend executes both.
- **Chat for reasoning, structured UI for decisions.** The LLM
  explains *why*; forms and panels capture *what*.
- **SPARQL validates, LLM advises.** The LLM suggests parameters;
  the frontend queries the graph and checks constraints. The LLM
  never needs to know specific product names or prices.
- **Iterate, don't restart.** "Swap the GPU", "reduce budget",
  "add streaming gear" are first-class operations on the current
  state, not new conversations.
- **Failures are soft.** Invalid LLM output degrades gracefully —
  the user can always manually browse and select products. The LLM
  accelerates the workflow but doesn't gate it.
