# Ultramarine Ledger: Implementation Tokens

Use these light-mode tokens as the implementation source of truth. Add the `:root` block after the Tailwind import in `src/app/globals.css`, followed by the Tailwind 4 theme bridge.

## 1. Token naming structure

| Category | Pattern | Example |
| --- | --- | --- |
| Color | `--{role}-{variant}` | `--bg-page`, `--primary-hover` |
| Spacing | `--space-{step}` plus semantic aliases | `--space-6`, `--page-padding-desktop` |
| Typography | `--font-family-*`, `--font-size-*`, `--line-height-*`, `--type-weight-*` | `--font-size-body` |
| Radius | `--shape-radius-{role}` | `--shape-radius-control` |
| Shadow | `--elevation-{level}` | `--elevation-floating` |
| Border | `--border-{property}` | `--border-width-default` |
| Stack | `--z-{layer}` | `--z-modal` |
| Motion | `--duration-*`, `--ease-*`, `--transition-*` | `--transition-interactive` |
| Breakpoint | `--breakpoint-{range}` | `--breakpoint-tablet` |

Names describe purpose, not a color or a specific component. Components consume these tokens without redefining them.

## 2. Canonical CSS variables

```css
:root {
  color-scheme: light;

  /* Color: backgrounds */
  --bg-page: #f4f3ef;
  --bg-surface: #ffffff;
  --bg-subtle: #f5f5fa;
  --bg-muted: #f1f2f7;
  --bg-disabled: var(--bg-muted);

  /* Color: borders */
  --border-default: #dddde5;
  --border-strong: #bec0cc;
  --border-selected: #8995e5;

  /* Color: text */
  --text-primary: #191a24;
  --text-secondary: #606371;
  --text-muted: #7a7d8b;
  --text-disabled: #9294a1;
  --text-on-primary: #ffffff;

  /* Color: brand and state */
  --primary: #3d4fd1;
  --primary-hover: #3546bf;
  --primary-active: #303faf;
  --primary-subtle: #eef0ff;

  --success: #237a57;
  --success-subtle: #eaf5ef;
  --warning: #9a6200;
  --warning-text: #754b00;
  --warning-subtle: #f6f2e8;
  --error: #b42318;
  --error-subtle: #fcedea;
  --info: #3157a4;
  --info-subtle: #edf3fc;

  --focus-ring: #6675e8;
  --overlay: rgb(25 26 36 / 48%);

  /* Color: contextual aliases */
  --selected-bg: var(--primary-subtle);
  --selected-border: var(--border-selected);
  --input-bg: var(--bg-surface);
  --input-border: var(--border-strong);
  --table-hover: var(--bg-subtle);
  --table-selected: var(--primary-subtle);

  /* Spacing: 4px base */
  --space-0: 0;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;

  --page-padding-mobile: var(--space-4);
  --page-padding-tablet: var(--space-6);
  --page-padding-desktop: var(--space-8);
  --section-gap: var(--space-12);
  --card-padding: var(--space-6);
  --card-padding-compact: var(--space-4);

  /* Typography */
  --font-family-sans: "Source Sans 3", system-ui, "Segoe UI", sans-serif;
  --font-family-mono: "IBM Plex Mono", ui-monospace, monospace;

  --font-size-caption: 0.75rem;
  --font-size-data: 0.8125rem;
  --font-size-ui: 0.875rem;
  --font-size-body: 1rem;
  --font-size-card-title: 1.125rem;
  --font-size-section-title: 1.5rem;
  --font-size-page-title-mobile: 1.875rem;
  --font-size-page-title: 2.25rem;

  --line-height-caption: 1rem;
  --line-height-data: 1.125rem;
  --line-height-ui: 1.25rem;
  --line-height-body: 1.5rem;
  --line-height-card-title: 1.5rem;
  --line-height-section-title: 1.9375rem;
  --line-height-page-title-mobile: 2.25rem;
  --line-height-page-title: 2.625rem;

  --type-weight-regular: 400;
  --type-weight-medium: 500;
  --type-weight-semibold: 600;
  --type-weight-bold: 700;
  --letter-spacing-normal: 0;
  --letter-spacing-title: -0.02em;

  /* Shape and borders */
  --shape-radius-none: 0;
  --shape-radius-tag: 0.375rem;
  --shape-radius-control: 0.5rem;
  --shape-radius-surface: 0.75rem;
  --shape-radius-modal: 1rem;
  --shape-radius-pill: 999px;

  --border-width-default: 1px;
  --border-width-strong: 2px;
  --border-width-marker: 3px;
  --border-style: solid;
  --focus-ring-width: 3px;
  --focus-ring-offset: 2px;

  /* Elevation */
  --elevation-none: none;
  --elevation-floating: 0 6px 18px rgb(25 26 36 / 10%);
  --elevation-overlay: 0 12px 32px rgb(25 26 36 / 12%);

  /* Stack */
  --z-base: 0;
  --z-sticky-header: 100;
  --z-dropdown: 200;
  --z-drawer: 300;
  --z-modal: 400;
  --z-toast: 500;
  --z-tooltip: 600;

  /* Motion */
  --duration-fast: 120ms;
  --duration-standard: 180ms;
  --ease-standard: cubic-bezier(0, 0, 0.2, 1);
  --transition-interactive: var(--duration-fast) var(--ease-standard);
  --transition-disclosure: var(--duration-standard) var(--ease-standard);
}
```

## 3. Tailwind 4 theme bridge

The bridge exposes the canonical values to Tailwind utilities. Breakpoints live here because Tailwind resolves responsive variants at build time.

```css
@theme inline {
  /* Colors: e.g. bg-bg-page, text-text-primary, border-border-default */
  --color-bg-page: var(--bg-page);
  --color-bg-surface: var(--bg-surface);
  --color-bg-subtle: var(--bg-subtle);
  --color-bg-muted: var(--bg-muted);
  --color-bg-disabled: var(--bg-disabled);
  --color-border-default: var(--border-default);
  --color-border-strong: var(--border-strong);
  --color-border-selected: var(--border-selected);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-text-disabled: var(--text-disabled);
  --color-text-on-primary: var(--text-on-primary);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-active: var(--primary-active);
  --color-primary-subtle: var(--primary-subtle);
  --color-success: var(--success);
  --color-success-subtle: var(--success-subtle);
  --color-warning: var(--warning);
  --color-warning-text: var(--warning-text);
  --color-warning-subtle: var(--warning-subtle);
  --color-error: var(--error);
  --color-error-subtle: var(--error-subtle);
  --color-info: var(--info);
  --color-info-subtle: var(--info-subtle);
  --color-focus-ring: var(--focus-ring);
  --color-overlay: var(--overlay);
  --color-selected-bg: var(--selected-bg);
  --color-selected-border: var(--selected-border);
  --color-input-bg: var(--input-bg);
  --color-input-border: var(--input-border);
  --color-table-hover: var(--table-hover);
  --color-table-selected: var(--table-selected);

  /* Type */
  --font-sans: var(--font-family-sans);
  --font-mono: var(--font-family-mono);
  --text-caption: var(--font-size-caption);
  --text-caption--line-height: var(--line-height-caption);
  --text-data: var(--font-size-data);
  --text-data--line-height: var(--line-height-data);
  --text-ui: var(--font-size-ui);
  --text-ui--line-height: var(--line-height-ui);
  --text-body: var(--font-size-body);
  --text-body--line-height: var(--line-height-body);
  --text-card-title: var(--font-size-card-title);
  --text-card-title--line-height: var(--line-height-card-title);
  --text-section-title: var(--font-size-section-title);
  --text-section-title--line-height: var(--line-height-section-title);
  --text-page-title: var(--font-size-page-title);
  --text-page-title--line-height: var(--line-height-page-title);
  --text-page-title-mobile: var(--font-size-page-title-mobile);
  --text-page-title-mobile--line-height: var(--line-height-page-title-mobile);
  --font-weight-regular: var(--type-weight-regular);
  --font-weight-medium: var(--type-weight-medium);
  --font-weight-semibold: var(--type-weight-semibold);
  --font-weight-bold: var(--type-weight-bold);
  --tracking-normal: var(--letter-spacing-normal);
  --tracking-title: var(--letter-spacing-title);

  /* Spacing, shape, and elevation */
  --spacing-1: var(--space-1);
  --spacing-2: var(--space-2);
  --spacing-3: var(--space-3);
  --spacing-4: var(--space-4);
  --spacing-5: var(--space-5);
  --spacing-6: var(--space-6);
  --spacing-8: var(--space-8);
  --spacing-10: var(--space-10);
  --spacing-12: var(--space-12);
  --spacing-16: var(--space-16);
  --radius-tag: var(--shape-radius-tag);
  --radius-control: var(--shape-radius-control);
  --radius-surface: var(--shape-radius-surface);
  --radius-modal: var(--shape-radius-modal);
  --radius-pill: var(--shape-radius-pill);
  --shadow-floating: var(--elevation-floating);
  --shadow-overlay: var(--elevation-overlay);

  /* Responsive variants: tablet:, desktop:, wide: */
  --breakpoint-tablet: 48rem;
  --breakpoint-desktop: 64rem;
  --breakpoint-wide: 90rem;
}
```

Use direct variable utilities for categories without a Tailwind theme namespace:

```html
<div class="z-[var(--z-modal)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]">
  <!-- content -->
</div>
```

## 4. Elevation usage

| Token | Use |
| --- | --- |
| `--elevation-none` | Page sheets, cards, tables, and inset regions |
| `--elevation-floating` | Dropdowns, tooltips, and compact popovers |
| `--elevation-overlay` | Modals and navigation drawers |

Keep normal surfaces flat. Elevation indicates that a layer floats above the current workflow.
