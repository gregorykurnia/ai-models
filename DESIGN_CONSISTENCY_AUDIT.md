# Visual Design Consistency Audit

Scope: lightweight code audit of the shared shell, global CSS, CSS modules, and representative routes: `/`, `/leaderboards/[evaluationSlug]`, `/suitability`, `/suitability/saved`, `/suitability/[taskId]`, `/about/data`, plus loading and error states. The audit prioritizes repeated patterns over one-off page details. Actual browser rendering, viewport behavior, and measured color contrast are marked **Needs visual verification** where code alone is insufficient.

## 1. Executive Summary

The app has a coherent baseline: a light background, white outlined surfaces, blue links and actions, compact data tables, and shared `panel`, `card`, `toolbar`, and `table-scroll` patterns. The global stylesheet is doing most of the visual-system work, and the data-heavy screens have several good accessibility foundations: table captions, scoped headers, `aria-sort`, live result counts, labeled controls, and keyboard-focusable scroll regions in the master and suitability tables.

The main consistency risk is that the system is implied rather than defined. Only four CSS variables exist (`--ink`, `--muted`, `--line`, `--accent`), while surfaces, control borders, focus rings, hover colors, state colors, radii, and spacing are repeated as literals across `globals.css`, `home.module.css`, and `suitability-planner.module.css`. Home cards intentionally override the global card grid and padding, while the suitability flow introduces its own control and layout rules. This makes the product look related today but makes future changes likely to drift.

Top strengths:

- Shared global primitives cover the major page shapes: shell, panel, card, toolbar, table, pager, breadcrumb, and prose content.
- The visual direction is restrained and suitable for a research and comparison product: high-contrast ink, muted metadata, a single primary accent, and low-noise borders.
- Desktop and mobile rules exist for the major layouts, including the catalog, header, planner toolbar, picker, and sticky table columns.
- Table interactions and model favorites include useful semantic attributes and status text.

Top problems:

- Spacing, breakpoints, typography, and control variants are split between global CSS and route-specific modules.
- Semantic color roles are incomplete; error, focus, favorite, selected, hover, and primary states use separate hardcoded colors.
- The main leaderboard, master leaderboard, and suitability comparison do not share one table or control primitive, so scroll behavior and header treatment differ.
- Navigation has no active route treatment, and the responsive header relies on wrapping/stacking rather than an explicit mobile navigation pattern.

## 2. Current / Implied Design Baseline

### Spacing and layout

There is a loose rhythm around 8, 12, 16, 24, 32, 40, and 48px, but no spacing tokens. The shell uses `main { max-width: 1440px; padding: 48px 5% }`, panels and default cards use 24px padding, mobile panels use 16px, and the home catalog changes to 16px cards with 12px gaps (`src/app/globals.css:4`, `src/app/home.module.css:5-14`). Planner controls add 8px, 10px, 12px, 16px, 20px, and 30px values in a separate module.

The implied layout system is a centered 1440px page with percentage gutters, full-width panels, a narrower 820px prose column, and horizontally scrolling data tables. Catalog layouts use four columns on the home page but three columns in the global baseline; planner and metric-group layouts use different breakpoints.

### Typography hierarchy

The production app uses Arial/Helvetica at 14px. The visible hierarchy is `h1` 38px desktop / 30px mobile, `h2` 20px, home card headings 16px, body copy with line-height 1.7, table text at 13px, and utility/meta text between 10px and 12px. Eyebrows are uppercase 11px blue labels with 1.6px tracking.

The hierarchy is understandable, but it is only partly centralized: `h3` is styled in the home module, `h2` has no shared margin or line-height rule, and the design-directions prototype uses a separate Inter-based system and several unrelated palettes. **Needs visual verification:** the final type scale, line lengths, and small metadata sizes should be checked at real desktop and mobile widths.

### Color usage and semantic roles

The root exposes only `--ink`, `--muted`, `--line`, and `--accent` (`src/app/globals.css:3`). Backgrounds, white surfaces, input borders, hover fills, focus rings, error borders, favorite gold, active fills, and primary hover colors are hardcoded. Metric colors are data-driven inline values and also include literals in `src/lib/aa-briefcase.ts`.

### Radius, borders, shadows, and surfaces

The dominant surface is white with a 1px light border and 12px radius. Controls use 7px; pickers and metric links use 8px; the brand icon uses 9px; status badges use a pill radius. The app has no production box-shadow declarations, so the hierarchy is communicated almost entirely by background and border. This is a valid flat style, but there is no documented surface or elevation scale.

### Component patterns

The repeated patterns are CSS class conventions rather than reusable UI components: `.panel`, `.card`, `.toolbar`, global `input/select/button`, table primitives, and planner-specific `.primary` / `.primaryLink`. The home page, leaderboards, and planner each add exceptions around these patterns.

## 3. Top Visual Consistency Issues

1. **The token layer is too small for the UI.**
   - **Where:** `src/app/globals.css:3-7`, `src/components/suitability-planner.module.css:1-10`, inline metric colors.
   - **Why it matters:** repeated literals make global changes risky and allow near-identical states to diverge.
   - **Recommended fix:** add semantic tokens for background, surface, surface-muted, text, text-muted, border, brand, brand-hover, focus, success, warning, danger, selection, radius, and spacing; replace repeated literals incrementally.
   - **Severity:** High.

2. **The spacing system splits at the home page and planner.**
   - **Where:** default `.card` and `.panel` use 24px, while home cards use 16px; gaps range from 4px to 40px.
   - **Why it matters:** cards and panels with the same visual role will have different density and internal alignment across routes.
   - **Recommended fix:** define a small 4px-based scale and explicit `compact`, `default`, and `comfortable` surface densities.
   - **Severity:** High.

3. **Page container rules are not explicit enough.**
   - **Where:** `main`, `.prose`, header/footer gutters, full-width planner content, and table wrappers.
   - **Why it matters:** page titles, navigation, panels, and prose can appear to use different left and right edges, especially on wide screens.
   - **Recommended fix:** create one shell container token/class and one readable-content width; allow data tables to opt into a controlled full-width region.
   - **Severity:** High.

4. **Responsive breakpoints and grid behavior diverge by route.**
   - **Where:** global catalog uses 3/2/1 columns at 1000/640px; home uses 4/3/2/1 at 1000/640/420px; planner uses 1100/640px; metric navigation uses 760px.
   - **Why it matters:** density changes at different widths and similar content may wrap or collapse differently.
   - **Recommended fix:** standardize a small breakpoint set and use content-driven grid rules where possible.
   - **Severity:** Medium.

5. **Typography hierarchy is incomplete and route-specific.**
   - **Where:** global `h1`/`h2`, home-only `h3`, body paragraphs, table metadata, and design-direction typography.
   - **Why it matters:** headings and supporting copy can change weight, line-height, or spacing depending on the page.
   - **Recommended fix:** define named display, heading, body, label, metadata, and data-text styles with line-heights and margins.
   - **Severity:** Medium.

6. **Buttons and action links are not one component family.**
   - **Where:** global button styling, planner `.primary`, and planner `.primaryLink`; normal links are also used as prominent actions.
   - **Why it matters:** visually equivalent actions can differ in padding, radius, hover behavior, and disabled treatment.
   - **Recommended fix:** share button variants for primary, secondary, quiet, icon, and destructive actions; provide a matching link-button variant.
   - **Severity:** High.

7. **Form controls are duplicated and only partly normalized.**
   - **Where:** global `input/select/button` rules versus planner textarea, labels, number fields, file input, checkbox, and search-field rules.
   - **Why it matters:** field height, border color, label weight, focus behavior, and spacing can vary within the same planner.
   - **Recommended fix:** create one field contract covering label, control, helper text, error text, textarea, select, checkbox, and file input.
   - **Severity:** Medium.

8. **Surface roles are visually similar but semantically undefined.**
   - **Where:** `.panel`, `.card`, `.picker`, `.metric-group-link`, `.badge`, and sticky table cells.
   - **Why it matters:** a user cannot reliably infer whether a white outlined region is a page section, interactive card, inset control group, or selected state.
   - **Recommended fix:** document and implement `surface`, `surface-inset`, `surface-interactive`, and `surface-selected`; keep padding and radius tied to those roles.
   - **Severity:** Medium.

9. **Semantic state coverage is incomplete.**
   - **Where:** error uses an orange left border, primary hover is a second blue literal, favorite uses gold, and disabled uses opacity only.
   - **Why it matters:** success, warning, invalid, selected, loading, and focus states do not have a consistent visual language.
   - **Recommended fix:** define state tokens and pair color with text, icon, border, or pattern so states remain understandable without color alone.
   - **Severity:** High.

10. **Navigation lacks current-location styling.**
    - **Where:** `src/app/layout.tsx` global header nav; only component-index links use `aria-current` styling.
    - **Why it matters:** users get no persistent visual cue for the current section, and the header competes with content links.
    - **Recommended fix:** add route-aware active styling and a consistent hover/focus treatment; validate the stacked mobile header at narrow widths.
    - **Severity:** Medium. **Needs visual verification.**

11. **Horizontal table scrolling is inconsistent.**
    - **Where:** master and suitability scroll regions have `role="region"` and `tabIndex={0}`; the main `Leaderboard` uses only `.table-scroll`.
    - **Why it matters:** keyboard and screen-reader users receive different affordances on equivalent data views, and sticky-column behavior changes on mobile.
    - **Recommended fix:** standardize a data-table wrapper with a label, keyboard focus, scroll affordance, sticky-column rules, and responsive minimum widths.
    - **Severity:** High.

12. **Responsive and accessibility risks need a real viewport pass.**
    - **Where:** 5% shell gutters, global 250px input minimums, `white-space: nowrap` table cells, 10px table metadata, dense planner toolbars, and the mobile header.
    - **Why it matters:** long model names, translated labels, zoom, and intermediate widths may create clipping or difficult horizontal scanning.
    - **Recommended fix:** test at 320px, 375px, 768px, 1024px, and wide desktop with keyboard navigation and 200% zoom; adjust wrapping and minimum sizes from evidence.
    - **Severity:** High. **Needs visual verification.**

## 4. Recommended Baseline System

- **Spacing:** `4, 8, 12, 16, 24, 32, 40, 48` tokens. Use 16px for compact cards, 24px for standard sections, and 32px+ only for page-level separation.
- **Typography:** choose one system font stack; define body 14/1.5, body-large 16/1.5, h3 18/1.3, h2 24/1.25, h1 40/1.1, label 13/1.4, metadata 12/1.4, and data text 13/1.4. Avoid 10px except for nonessential annotations.
- **Color tokens:** separate `bg`, `surface`, `surface-muted`, `text`, `text-muted`, `border`, `brand`, `brand-hover`, `focus`, `success`, `warning`, `danger`, and `selected`; keep metric colors in a distinct data-visualization group.
- **Radius:** 6px controls, 8px interactive surfaces, 12px panels/cards, and 999px pills.
- **Elevation:** keep the flat border baseline, then add one restrained shadow level for menus or raised overlays and one stronger level for dialogs. Do not add shadows to every card.
- **Buttons:** shared 40px minimum-height controls with primary, secondary, quiet, icon, and disabled states; matching link-button styles.
- **Inputs/forms:** shared label-to-control spacing, 40–44px control height, consistent borders and focus rings, helper/error slots, and normalized textarea/select/file styles.
- **Cards:** one surface primitive with `compact` and `default` density; avoid page selectors that override the same card class.
- **Page containers:** one shell container with a documented max width and fixed responsive gutters; one readable prose width; an explicit full-width table option.
- **States:** define hover, focus, active, selected, disabled, loading, empty, success, warning, error, and info styles. Use `aria-current`, `aria-selected`, and text/icon cues alongside color.

## 5. Quick Wins

1. Add semantic color, spacing, radius, and focus tokens to `globals.css`.
2. Replace hardcoded control border, hover, focus, primary-hover, error, and favorite colors.
3. Normalize `.panel` and `.card` padding through a density rule instead of route-specific overrides.
4. Create shared button and link-button classes and use them for planner actions and prominent home CTAs.
5. Define shared heading, label, metadata, and table-text styles, including margins and line-heights.
6. Centralize the page container and responsive gutter rules.
7. Add active styling to main navigation and confirm mobile header behavior.
8. Give every horizontally scrolling table the same labeled, keyboard-focusable wrapper.
9. Normalize textarea, number, checkbox, select, search, and file-input presentation.
10. Reconcile the production CSS with `design-directions/index.html`, or clearly mark the prototype tokens as exploratory so they do not become a second source of truth.

## 6. Files / Components to Standardize First

1. `src/app/globals.css` — establish the tokens, shell, typography, surfaces, control states, and breakpoint contract.
2. `src/app/layout.tsx` — standardize the page container, header navigation, active route state, and footer alignment.
3. `src/components/leaderboard.tsx` and `src/components/master-leaderboard.tsx` — extract shared filters, table headers, scroll regions, pagination, and empty states.
4. `src/components/suitability-planner.module.css` and `src/components/suitability-planner.tsx` — migrate planner fields, buttons, pickers, chips, badges, and saved-task surfaces to the shared primitives.
5. `src/components/suitability-comparison.tsx` — align comparison tables with the leaderboard table contract.
6. `src/app/home.module.css` — remove global-card overrides where possible and make the catalog density an explicit shared variant.
7. `design-directions/index.html` — reconcile prototype palettes and typography with the production token source before further visual iteration.
