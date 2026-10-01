# Ultramarine Ledger: Core Design System Foundation

This light-only foundation defines shared layout, spacing, type, color, surface, state, and accessibility rules. It stops before component specifications.

## 1. Layout system

| Area | Foundation rule |
| --- | --- |
| App shell | Use a fixed, independently scrollable 240px left rail and one main content column at desktop widths. The content area owns page scrolling. |
| Page container | Center one shared container in the main area. Align the page header, evidence sheet, and supporting sections to it. |
| Maximum width | Cap main content at 1440px. Tables may fill it; cap prose at 760px. |
| Page padding | Use 32px on desktop, 24px on tablet, and 16px on mobile. Wide screens may use 48px within the 1440px cap. |
| Page rhythm | Use 32px from page header to primary sheet and 48px between page-level sections. |
| Working surface | Give each route one dominant white evidence sheet containing its filters, summary, data, pagination, and provenance. |
| Header | When needed, use a 64px sticky header in the main area. Keep it white with a bottom border and no resting shadow. |
| Navigation | Show icon and label in the rail with a clear current route. Below 1024px, use a 56px top bar and a modal navigation drawer. |
| Grid | Use 12 columns on desktop, 6 on tablet, and one flow on mobile. Use 24px desktop and 16px mobile gutters. Repeatable cards use an intrinsic grid with a 240px minimum. |
| Density | Use 48px table rows, or 52px with secondary metadata; 40–44px controls; and 8–12px gaps within control groups. |

### Responsive behavior

- **Wide, 1440px and above:** 240px rail; main container capped at 1440px.
- **Desktop, 1024–1439px:** 224px rail; 24px page padding when data needs room.
- **Tablet, 768–1023px:** use the top app bar and navigation drawer; stack page-header actions below the title; move secondary toolbars to a second row.
- **Mobile, below 768px:** use 16px gutters, one column, and full-width primary actions where useful. Keep the identity column sticky in scrolling tables.
- Preserve essential data. Use column priority, horizontal scrolling, and a visible overflow cue.
- Stack only the app bar and table header. Avoid additional sticky layers on short viewports.

## 2. Spacing system

Use a 4px base unit. Use this scale unless typography or an external asset requires an exception.

| Token | Value | Primary use |
| --- | ---: | --- |
| 0 | 0 | Flush relationships |
| 1 | 4px | Icon correction, compact metadata |
| 2 | 8px | Label-to-control, icon-to-label, tight groups |
| 3 | 12px | Related controls, compact cell content |
| 4 | 16px | Mobile gutters, field groups, compact cards |
| 5 | 20px | Comfortable control clusters |
| 6 | 24px | Default card padding, grid gutters |
| 8 | 32px | Evidence-sheet padding, page-header gap |
| 10 | 40px | Large internal section break |
| 12 | 48px | Page-section separation |
| 16 | 64px | Rare major page boundary |

- **Page padding:** 32px desktop, 24px tablet, 16px mobile; use the same value on both horizontal edges.
- **Section spacing:** 48px between page-level subjects; 32px between subsections; 16px between a heading and its content.
- **Card padding:** 24px standard, 16px compact. Use 32px only for a major explanatory or decision area.
- **Forms:** 8px from label to control, 8px from control to helper or error text, 16px between related fields, and 24px between field groups.
- **Modal and drawer:** 24px padding on desktop, 16px on mobile; 24px between header, body, and footer regions. Keep action gaps at 8px.
- **Responsive rule:** reduce outer padding first. Keep at least 16px page gutters, 16px card padding, and 8px between controls.

## 3. Typography system

Use **Geist** with `system-ui`, `Segoe UI`, and sans-serif fallbacks for all interface, table, and comparison text. Keep numeric alignment with tabular figures in the same Geist family. Reserve **Geist Mono** for code-like content outside tables. Use sentence case.

| Role | Size / line height | Weight | Guidance |
| --- | --- | ---: | --- |
| Page title | 36px / 42px desktop; 30px / 36px mobile | 650–700 | One per page; two lines maximum. |
| Section title | 24px / 31px | 650 | Introduces a major region inside the page. |
| Card title | 18px / 24px | 600 | Use for a distinct inset or repeatable item. |
| Body | 16px / 24px | 400 | Default copy; keep lines near 65–75 characters. |
| Small text | 14px / 20px | 400 | Compact UI copy and secondary descriptions. |
| Caption | 12px / 16px | 400 | Dates, provenance, and optional metadata. |
| Label | 14px / 20px | 600 | Form and filter labels; place near the control they name. |
| Helper text | 13px / 18px | 400 | Explain format or consequence. |
| Error text | 13px / 18px | 600 | State the problem and recovery action. |
| Button text | 14px / 20px | 600 | Short action phrase; no letter spacing or all caps. |
| Navigation text | 14px / 20px | 600 | Current item uses weight plus fill and marker, never weight alone. |
| Table text | 13px / 18px | 400 | Use 600 for headers and key identities; use tabular figures for numeric cells. |

- Use primary text for titles, labels, and core data; secondary text for explanations; muted text only for optional metadata.
- Do not use font sizes below 12px. Avoid uppercase as a structural heading treatment.
- Allow zoom and font scaling without clipping; controls and rows grow with wrapped content.

## 4. Color system

All roles below are for the single light theme.

| Semantic role | Value | Usage |
| --- | --- | --- |
| Page background | `#F4F3EF` | Warm limestone app canvas |
| Surface background | `#FFFFFF` | Evidence sheets, cards, overlays |
| Subtle background | `#F5F5FA` | Hover and low-emphasis grouped regions |
| Muted background | `#F1F2F7` | Table headers and readonly regions |
| Border | `#DDDDE5` | Section structure, cards, dividers |
| Border strong | `#BEC0CC` | Controls, hover boundaries, resize edges |
| Primary text | `#191A24` | Titles, labels, data |
| Secondary text | `#606371` | Supporting copy |
| Muted text | `#7A7D8B` | Optional metadata only |
| Disabled text | `#9294A1` | Disabled labels paired with a disabled surface |
| Primary action | `#3D4FD1` | Main action, links, current location |
| Primary hover | `#3546BF` | Hovered primary action |
| Primary active | `#303FAF` | Pressed primary action |
| Primary subtle | `#EEF0FF` | Active navigation, selected or informative inset |
| Success | `#237A57` / `#EAF5EF` | Confirmed or healthy state |
| Warning | `#9A6200` / `#F6F2E8` | Risk, incomplete data, caution |
| Error | `#B42318` / `#FCEDEA` | Invalid, failed, destructive state |
| Info | `#3157A4` / `#EDF3FC` | Neutral product guidance |
| Focus ring | `#6675E8` | 3px keyboard focus ring with 2px white offset |
| Overlay | `rgba(25, 26, 36, 0.48)` | Modal and drawer scrim |
| Selected | `#EEF0FF` fill, `#8995E5` border | Selected rows, items, filters |
| Input background | `#FFFFFF` | Editable controls |
| Input border | `#BEC0CC` | Resting control boundary |
| Table hover | `#F5F5FA` | Whole-row hover |
| Table selected | `#EEF0FF` | Whole-row selection with leading marker |

- Verify white text contrast on solid actions. Warning text on pale sand uses `#754B00`.
- Keep semantic colors for state communication. Benchmark colors use a separate data palette.
- Selected states combine fill, border, and a 3px ultramarine leading marker. Do not communicate selection with color alone.

## 5. Surface system

### Radius and borders

- Radius scale: 0px tables/dividers, 6px tags, 8px controls, 12px cards/sheets, 16px modals, and 999px only for status or removable-filter pills.
- Use 1px borders for all resting structure. Use 2px only for validation emphasis or a selected control when the leading marker is unsuitable.
- Use the standard border for passive structure and dividers; use the strong border for inputs, interactive boundaries, and hover reinforcement.

### Elevation

| Level | Treatment | Use |
| --- | --- | --- |
| 0 | No shadow | Page sheets, cards, tables, inset regions |
| 1 | `0 6px 18px rgba(25, 26, 36, 0.10)` | Dropdowns, tooltips, compact popovers |
| 2 | `0 12px 32px rgba(25, 26, 36, 0.12)` | Modals and navigation drawers |

- **Cards:** white, 1px standard border, 12px radius, no shadow. Prefer section dividers inside the main sheet over nested cards.
- **Modals, dropdowns, popovers:** white with a strong border and floating elevation. Use 16px modal radius and 8–12px for smaller surfaces.
- **Dividers:** use a 1px standard border between related sections and align it with content edges.
- Use borders for persistent structure, shadows for floating layers, and background tinting for state, grouping, or readonly areas.

## 6. State system

| State | Rule |
| --- | --- |
| Hover | Apply only to interactive elements. Shift background or border one step; keep geometry stable. |
| Focus | Show the 3px ring for keyboard focus on every interactive element. |
| Active | Use the primary active color or a slightly stronger neutral fill; provide immediate pressed feedback without movement. |
| Selected | Combine lavender fill, selected border, leading marker, and the relevant selection attribute. |
| Disabled | Use disabled text, muted background, standard border, and a blocked cursor where appropriate. Remove unavailable elements from tab order. |
| Loading | Preserve layout, label unknown-duration progress, and reserve skeletons for content regions. Prevent duplicate submission. |
| Success | Pair green with a confirmation icon and specific text; keep confirmation near the action or field it refers to. |
| Error | Pair red with an icon, clear text, and the affected boundary. Preserve values and explain recovery. |
| Empty | Explain what is absent and offer one relevant next action. Distinguish first-use empty states from no-results states. |
| Readonly | Use the muted background with primary text and a visible label; keep selectable text and avoid disabled styling. |
| Expanded / collapsed | Keep the trigger in place, rotate or swap its disclosure icon, and expose the state programmatically. |
| Open / closed | Place floating content by its trigger when possible; return focus on close. |

Use 120–180ms ease-out transitions for color, border, opacity, and disclosure. Respect reduced-motion preferences and avoid decorative loading motion.

## 7. Accessibility rules

- Meet WCAG AA contrast: at least 4.5:1 for normal text and 3:1 for large text, icons, focus indicators, and meaningful boundaries.
- Keep keyboard focus visible against white and tinted surfaces.
- Use 44×44px targets for primary and touch controls; compact desktop controls may use 40×40px with enough separation.
- Give every input a persistent visible label. Placeholder text may show an example but never replace the label.
- Support logical keyboard order, expected arrow keys, Escape to close overlays, and focus return after dismissal.
- State the error and corrective action. Associate field errors programmatically and summarize multiple submission errors.
- Give icon-only buttons an accessible name and tooltip. Use visible text for unfamiliar or consequential actions.
- Pair status and selection colors with text, icons, markers, or patterns. Never require color perception to understand meaning.
- Preserve content at 200% zoom and 320px CSS width. Keep horizontal scrolling inside data regions.
- Use semantic headings, landmarks, table headers, captions, and live regions for changing result counts or save status.
