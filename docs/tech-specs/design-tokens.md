# TrustGraph Toolkit — Design Tokens Reference

This document captures the visual design language currently used across the
TrustGraph UX. These values form the basis of the toolkit's default theme
and should be consolidated into a token system that consumers can override.

## Typography

### Font families

| Token        | Value                                        | Usage                            |
|--------------|----------------------------------------------|----------------------------------|
| `sans`       | `'IBM Plex Sans', -apple-system, sans-serif` | Body text, headings, UI labels   |
| `mono`       | `'IBM Plex Mono', monospace`                 | Code, metadata, technical labels |

### Font sizes

| Token   | Value  | Usage                                          |
|---------|--------|-------------------------------------------------|
| `xs`    | 10px   | Section labels, small metadata, property names  |
| `sm`    | 11px   | Filter labels, badges, status text, hints       |
| `base`  | 12px   | Default UI text, table headers, toast content   |
| `md`    | 13px   | Body text, search input placeholder, results    |
| `lg`    | 14px   | Input text, message content                     |
| `xl`    | 16px   | Header title                                    |
| `2xl`   | 18px   | Card titles (ontology)                          |
| `3xl`   | 20px   | Panel titles                                    |
| `4xl`   | 24px   | Large display numbers                           |

Note: Graph canvas rendering also uses 8px, 9px, and 22px for node/edge
labels — these are renderer-specific and may not need general tokens.

### Font weights

| Token      | Value | Usage                                |
|------------|-------|--------------------------------------|
| `normal`   | 400   | Body text, default                   |
| `semibold` | 600   | Buttons, emphasis, table headers     |
| `bold`     | 700   | Titles, headings, strong emphasis    |

### Line heights

| Token     | Value | Usage                              |
|-----------|-------|------------------------------------|
| `tight`   | 1     | Single-line elements (icons, etc.) |
| `snug`    | 1.4   | Compact text (toasts, tooltips)    |
| `normal`  | 1.5   | Body text, data display            |
| `relaxed` | 1.6   | AI response text, reading content  |

### Letter spacing

| Token       | Value    | Usage                          |
|-------------|----------|--------------------------------|
| `tight`     | -0.02em  | Large headings                 |
| `normal`    | 0        | Default                        |
| `wide`      | 0.05em   | Subtitle labels, summary stats |
| `wider`     | 0.1em    | Section labels (uppercase)     |

## Colour palette

### Brand palette

| Token     | Value     |
|-----------|-----------|
| `emerald` | `#6EE7B7` |
| `pink`    | `#F9A8D4` |
| `blue`    | `#93C5FD` |
| `amber`   | `#FCD34D` |
| `purple`  | `#C4B5FD` |
| `rose`    | `#FDA4AF` |
| `cyan`    | `#67E8F9` |
| `red`     | `#FCA5A5` |
| `orange`  | `#F97316` |

### Semantic colours

| Token         | Value     | Usage                      |
|---------------|-----------|----------------------------|
| `success`     | `#6EE7B7` | Success states, answers    |
| `error`       | `#f66`    | Error states               |
| `warning`     | `#F97316` | Warnings                   |
| `info`        | `#93C5FD` | Informational, thinking    |
| `thinking`    | `#93C5FD` | AI thinking indicator      |
| `observation` | `#C4B5FD` | Observations               |
| `answer`      | `#6EE7B7` | AI answer text             |
| `user`        | `#FCD34D` | User input accent          |

### Text colours (dark theme)

| Token      | Value   | Approx opacity |
|------------|---------|----------------|
| `primary`  | `#ddd`  | High           |
| `secondary`| `#bbb`  | Medium-high    |
| `muted`    | `#aaa`  | Medium         |
| `subtle`   | `#888`  | Medium-low     |
| `faint`    | `#666`  | Low            |
| `disabled` | `#555`  | Very low       |
| `hint`     | `#444`  | Minimal        |

Note: `#fff` is used directly in some places (graph highlights, header
active state) — this should become a `text.bright` or `text.inverse` token.

### Surface colours (dark theme)

| Token          | Value                      |
|----------------|----------------------------|
| `base`         | `#0A0A0F`                  |
| `overlay`      | `rgba(15,15,20,0.95)`      |
| `overlayLight` | `rgba(15,15,20,0.8)`       |
| `card`         | `rgba(255,255,255,0.02)`   |
| `cardHover`    | `rgba(255,255,255,0.04)`   |

Note: Several components use `rgba(10,10,15,0.95)` and
`rgba(12,12,18,0.95)` as slight variations of `overlay` — these should
be consolidated.

### Border colours (dark theme)

| Token     | Value                      |
|-----------|----------------------------|
| `subtle`  | `rgba(255,255,255,0.04)`   |
| `default` | `rgba(255,255,255,0.06)`   |
| `medium`  | `rgba(255,255,255,0.1)`    |
| `grid`    | `rgba(255,255,255,0.015)`  |

## Spacing

Spacing values cluster around a loose 4px base grid:

| Token | Value | Usage                                      |
|-------|-------|--------------------------------------------|
| `1`   | 4px   | Tight gaps (badge arrays, zoom controls)   |
| `2`   | 6px   | Small gaps (entity badges, tag lists)      |
| `3`   | 8px   | Standard gap (filter items, form elements) |
| `4`   | 10px  | Component internal padding                 |
| `5`   | 12px  | Section gaps, toast spacing                |
| `6`   | 16px  | Component padding, column gaps             |
| `7`   | 20px  | Section padding                            |
| `8`   | 24px  | Card padding, large section gaps           |
| `9`   | 28px  | Page-level padding                         |
| `10`  | 32px  | Large section margins                      |

## Border radii

| Token   | Value | Usage                              |
|---------|-------|------------------------------------|
| `sm`    | 4px   | Small elements, zoom buttons       |
| `md`    | 6px   | Badges, inline cards               |
| `lg`    | 8px   | Inputs, buttons, tooltips          |
| `xl`    | 10px  | Message bubbles, cards             |
| `2xl`   | 12px  | Large cards                        |
| `pill`  | 20px  | Filter buttons, pill shapes        |
| `full`  | 50%   | Circular elements                  |

## Shadows

| Token     | Value                           | Usage        |
|-----------|---------------------------------|--------------|
| `none`    | `none`                          | Default      |
| `toast`   | `0 4px 20px rgba(0,0,0,0.4)`   | Toast popups |
| `glow`    | `0 0 Npx <color>` (dynamic)    | Badge glow   |

## Z-index

| Token     | Value | Usage                |
|-----------|-------|----------------------|
| `tooltip` | 10    | Graph tooltips       |
| `toast`   | 1000  | Toast notifications  |

## Transitions

| Token     | Value    | Usage                |
|-----------|----------|----------------------|
| `default` | `0.2s`   | General transitions  |

Currently only `all 0.2s` and `width 0.2s` are used. A standard easing
curve is not yet defined — `ease-out` is used in the toast slide-in
animation.

## Opacity conventions

These opacity values are used consistently for dynamic colour
manipulation (appending hex alpha to colour values):

| Hex suffix | Approx opacity | Usage                    |
|------------|----------------|--------------------------|
| `10`       | 6%             | Very faint backgrounds   |
| `15`       | 8%             | Subtle backgrounds       |
| `1a`       | 10%            | Button backgrounds       |
| `22`       | 13%            | Card borders, tints      |
| `35`       | 21%            | Selected badge bg        |
| `44`       | 27%            | Borders, shadows         |
| `88`       | 53%            | Active borders           |
| `cc`       | 80%            | Text on coloured bg      |
