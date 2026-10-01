# Ultramarine Ledger: Core Shared Components

This light-only specification defines the first shared component layer for Ultramarine Ledger. Components consume the foundation and canonical tokens; they must not inherit legacy styling or introduce local colors, spacing scales, radii, shadows, or type rules.

## Button

| Aspect | Rule |
| --- | --- |
| Purpose | Trigger a clear, immediate action. Use one primary button per action group. |
| Variants | **Primary:** main commit action. **Secondary:** bordered alternative. **Quiet:** low-emphasis or toolbar action. **Destructive:** irreversible or high-risk action; require confirmation when consequences are material. |
| Sizes | **Compact:** 40px high, 12px horizontal padding. **Default:** 44px high, 16px padding. **Large:** 48px high, 20px padding; use sparingly for a page-level action. Use 18px icons and the control radius. |
| Spacing | Keep 8px between icon and label and 8px between adjacent buttons. Place the primary action at the logical end of the group. |
| States | Rest, hover, active, keyboard focus, disabled, and loading. Loading preserves width, replaces or precedes the icon with a spinner, and blocks repeat submission. |
| Accessibility | Use a native `button`, an action verb, and visible text for consequential actions. Expose loading with `aria-busy`; do not remove the accessible name when the visual label changes. |
| Responsive | Allow action groups to wrap. On narrow screens, make the primary action full width when it improves completion; keep secondary actions below or beside it according to task priority. |

## IconButton

| Aspect | Rule |
| --- | --- |
| Purpose | Trigger a familiar, compact action where a text label would create noise. |
| Variants | **Neutral:** standard toolbar action. **Subtle:** on tinted or dense surfaces. **Primary:** selected or emphasized action. **Destructive:** remove or delete. |
| Sizes | **Compact:** 40px square. **Default:** 44px square. Use an 18px icon, centered, with the control radius; do not use circular styling by default. |
| Spacing | Keep at least 4px between adjacent icon buttons and 8px between an IconButton and a text control. |
| States | Rest, hover, active, keyboard focus, selected, disabled, and loading. Selected uses both the selected treatment and a programmatic pressed state. |
| Accessibility | Provide an accessible name and tooltip. Use `aria-pressed` for toggles and `aria-expanded` for disclosure; do not rely on the icon shape or color alone. |
| Responsive | Keep the 44px touch target on mobile. Move low-priority actions into an overflow menu rather than shrinking targets or crowding the row. |

## Input

| Aspect | Rule |
| --- | --- |
| Purpose | Capture a short, single-line value. |
| Variants | **Default.** **With leading or trailing affordance:** icon, unit, or clear action. **Readonly:** selectable value on the muted surface. Do not use placeholder-only or underline-only inputs. |
| Sizes | **Compact:** 40px high for dense desktop filters. **Default:** 44px high. Use 12px horizontal padding; reserve 36px at an edge that contains an affordance. |
| Spacing | Keep 8px from Label to control and 8px from control to HelperText or ErrorText. Group related inputs 16px apart. |
| States | Empty, populated, hover, focus, invalid, disabled, readonly, and loading when validation is asynchronous. Invalid uses the error boundary and message without clearing the value. |
| Accessibility | Use the correct input type and autocomplete value. Associate Label, description, and error by ID; expose invalid state with `aria-invalid`. Placeholder text is an example only. |
| Responsive | Fill the available field width. Keep prefixes, suffixes, and clear actions visible; allow surrounding field grids to collapse to one column rather than compressing the input. |

## TextArea

| Aspect | Rule |
| --- | --- |
| Purpose | Capture multi-line notes, prompts, descriptions, or rationale. |
| Variants | **Default.** **With character count.** **Readonly.** Avoid rich-text behavior in the base component. |
| Sizes | **Compact:** 96px minimum height. **Default:** 120px minimum height. **Extended:** 192px minimum height. Use 12px horizontal and 10px vertical padding. |
| Spacing | Follow Input field spacing. Place a character count on the helper row, aligned opposite helper or error text. |
| States | Empty, populated, hover, focus, invalid, disabled, readonly, and limit reached. Allow vertical resize only; set a sensible page-specific maximum height. |
| Accessibility | Use a persistent Label and an announced character limit when one exists. Do not block paste or silently truncate content. |
| Responsive | Use full width and preserve the minimum height. On mobile, avoid fixed heights that obscure content behind the software keyboard. |

## Select

| Aspect | Rule |
| --- | --- |
| Purpose | Choose one value from a known, reasonably short list. Use a combobox or Search component later for long or filterable lists. |
| Variants | **Default.** **With leading icon.** **Readonly display.** Use native select behavior where it satisfies product and browser requirements. |
| Sizes | **Compact:** 40px high. **Default:** 44px high. Use 12px left padding, an 18px chevron, and at least 36px reserved on the trailing edge. |
| Spacing | Follow Input field spacing. Separate options into labeled groups only when groups make the choice easier to scan. |
| States | Placeholder, selected, hover, focus, open, invalid, disabled, and loading. The placeholder is not a valid value when selection is required. |
| Accessibility | Associate a visible Label and error text. Preserve native keyboard behavior; custom implementations must expose combobox/listbox semantics, active option, selection, and open state. |
| Responsive | Fill the field width. Popovers must stay within the viewport, match at least the trigger width, and use an internal scroll region for long lists. |

## Checkbox

| Aspect | Rule |
| --- | --- |
| Purpose | Select zero or more independent options or confirm an explicit statement. |
| Variants | **Unchecked.** **Checked.** **Indeterminate** for a partially selected group. Optional supporting text belongs beneath the label. |
| Sizes | Use a 20px square visual control inside a minimum 44px-high hit area. The check icon is 14px. |
| Spacing | Keep 8px between control and label, 4px between label and supporting text, and 12px between stacked options. |
| States | Rest, hover, active, keyboard focus, checked, indeterminate, invalid, and disabled. Keep the focus ring around the control or the complete hit area. |
| Accessibility | Use a native checkbox when possible. Clicking the visible label toggles it. Expose indeterminate programmatically and group related options with `fieldset` and `legend`. |
| Responsive | Keep label text wrapping beside the control with top alignment. Never reduce the hit target on small screens. |

## Switch

| Aspect | Rule |
| --- | --- |
| Purpose | Change a binary setting that takes effect immediately. Use Checkbox when the value is submitted with a form or confirms agreement. |
| Variants | **Off.** **On.** Optional icon-free status text may clarify unusual settings; do not place text inside the track. |
| Sizes | **Default:** 44×24px track with a 20px thumb. A compact 36×20px visual is allowed in dense desktop rows only when its hit area remains at least 40×40px. |
| Spacing | Keep 8px between switch and label and 4px between label and supporting text. |
| States | Off, on, hover, active, keyboard focus, disabled, and pending. Pending prevents repeated changes and preserves the last confirmed value on failure. |
| Accessibility | Use a native checkbox or `role="switch"` with an accessible name and `aria-checked`. The label describes the setting, not the current state. Announce save failures nearby. |
| Responsive | Keep the label and switch in one row when possible; wrap supporting text below the label, not below the switch. Maintain the touch target. |

## FormField

| Aspect | Rule |
| --- | --- |
| Purpose | Compose Label, one control, and its helper, error, or success messaging into a consistent field unit. |
| Variants | **Standard.** **Required.** **Optional.** **Horizontal** for short desktop settings only. **Grouped** for Checkbox or Switch sets. |
| Sizes | The child control owns height. FormField owns text placement and vertical rhythm, not a visual container. |
| Spacing | 8px Label-to-control and 8px control-to-message; 4px between multiple message lines. Use 16px between fields and 24px between field groups. |
| States | Default, focused child, invalid, disabled, readonly, validating, success. Show ErrorText instead of HelperText when invalid; do not show contradictory messages. |
| Accessibility | Generate stable IDs and relationships for label, description, and error. Required status must be visible and programmatic. For multiple errors, also support a form-level summary. |
| Responsive | Stack horizontal fields below tablet width or when labels wrap. Keep the message directly beneath its control in every layout. |

## Label

| Aspect | Rule |
| --- | --- |
| Purpose | Persistently name a form control and clarify whether input is required or optional. |
| Variants | **Standard.** **Required:** concise text marker plus programmatic requirement. **Optional:** use only when most fields are required. **Group label:** names a fieldset. |
| Sizes | Use the shared Label type role. Keep status markers at the same size and baseline. |
| Spacing | Keep markers 4px from label text and the label 8px above its control. |
| States | Default, disabled, invalid, and readonly. State styling supplements the associated control; it does not replace field messaging. |
| Accessibility | Use `label[for]` or `legend`, never a generic text element alone. Keep labels visible after entry and avoid instructions embedded only in labels. |
| Responsive | Allow wrapping to two lines without clipping. Place long instructions in HelperText rather than widening the label column. |

## HelperText

| Aspect | Rule |
| --- | --- |
| Purpose | Explain format, constraints, consequence, or optional guidance before an error occurs. |
| Variants | **Guidance.** **Constraint or count.** **Success confirmation** only when field-level confirmation is useful. |
| Sizes | Use the shared Helper Text type role; icons, when necessary, are 16px. |
| Spacing | Place 8px below the control; use a 6px icon-to-text gap and 4px between wrapped message lines. |
| States | Default, success, and disabled context. Replace with ErrorText when the field is invalid unless both messages are essential and non-contradictory. |
| Accessibility | Associate it with the control through `aria-describedby`. Keep wording concise and do not encode essential meaning only with color or an icon. |
| Responsive | Wrap naturally to the control width. Keep counters aligned to the end only when enough width remains; otherwise place them on the next line. |

## ErrorText

| Aspect | Rule |
| --- | --- |
| Purpose | Identify a validation problem and state how to correct it. |
| Variants | **Field error.** **Group error.** **Submission error reference** that points users to the affected field. |
| Sizes | Use the shared Error Text type role with an optional 16px error icon. |
| Spacing | Place 8px below the affected control with a 6px icon-to-text gap. Keep it inside the FormField. |
| States | Appears after relevant validation or failed submission and remains until corrected. Do not flash during normal typing unless immediate validation is necessary. |
| Accessibility | Connect with `aria-describedby` and set `aria-invalid` on the control. Announce newly added errors; move focus to an error summary after failed multi-field submission. |
| Responsive | Wrap without truncation and keep the corrective action in the first sentence. Never hide field errors behind a tooltip. |

## Card

| Aspect | Rule |
| --- | --- |
| Purpose | Group a distinct, reusable subject within a page when a divider or section alone is insufficient. |
| Variants | **Standard:** bordered white surface. **Compact:** dense supporting content. **Interactive:** entire card is one navigation target. **Selected:** for selectable collections. Avoid nested cards. |
| Sizes | Width follows its grid. Use 24px standard or 16px compact padding, the surface radius, default border, and no resting shadow. |
| Spacing | Use 16px between title and content, 24px between major internal regions, and 16–24px grid gaps between cards. Align repeated card actions consistently. |
| States | Rest, hover and focus for interactive cards, selected, disabled when genuinely unavailable, loading, and error. Hover must not imply interactivity on static cards. |
| Accessibility | Use a semantic heading in each substantial card. If the whole card is interactive, provide one clear link target and avoid nested interactive controls. Expose selection programmatically. |
| Responsive | Use the intrinsic 240px-minimum grid, then stack to one column. Reduce padding to 16px on mobile; do not turn core tabular comparisons into cards. |

## Badge / Tag

| Aspect | Rule |
| --- | --- |
| Purpose | **Badge:** show compact status or count. **Tag:** label a category, applied filter, or removable value. Neither is a general-purpose button. |
| Variants | **Neutral, info, success, warning, error.** Tags may be **removable** or **selectable**. Use semantic variants only for real state meaning. |
| Sizes | **Small:** 20px high, 6px horizontal padding. **Default:** 24px high, 8px padding. Use the tag radius; use the pill radius only for status, counts, or removable filters. |
| Spacing | Keep 4px between icon and text and 8px between items in a wrapping group. Removable tags reserve a separate 20px clear target inside an overall 32px-minimum hit area. |
| States | Static, hover/focus for interactive tags, selected, disabled, and removable. Static badges have no hover treatment. |
| Accessibility | Include visible text; do not use color alone. Announce counts with context. Give removal controls a specific name such as “Remove provider: OpenAI.” |
| Responsive | Wrap tags onto additional lines; never horizontally squeeze or truncate status text. Collapse large filter sets behind FilterBar behavior later. |

## Alert

| Aspect | Rule |
| --- | --- |
| Purpose | Present important inline guidance or a persistent page/section status that users should notice in context. |
| Variants | **Info, success, warning, error.** Each uses a semantic icon, tinted surface, semantic text/accent, and optional action. |
| Sizes | **Compact:** 12px padding for local messages. **Default:** 16px padding for page or section messages. Use an 18px icon and control radius. |
| Spacing | Keep 8px icon-to-content, 4px title-to-body, and 12px content-to-action. Align the icon with the first text line. |
| States | Static, dismissible, and action-required. A dismissed alert stays dismissed only when the underlying condition permits it. |
| Accessibility | Use `status` for non-urgent updates and `alert` only for urgent, newly introduced errors. Provide a heading when the body is more than one sentence and name the dismiss action. |
| Responsive | Let actions wrap below content and use full-width buttons only when needed. Keep alerts in document flow; do not make them horizontally scroll. |

## Toast

| Aspect | Rule |
| --- | --- |
| Purpose | Confirm a completed action or report a brief asynchronous outcome without interrupting the workflow. Do not use for validation or information required to continue. |
| Variants | **Success, info, warning, error.** May include one short recovery action such as Undo or Retry and a dismiss control. |
| Sizes | 320–400px wide on desktop; content width minus 32px on mobile. Use 16px padding, an 18px icon, control radius, strong border, and floating elevation. |
| Spacing | Keep 8px icon-to-content, 4px title-to-body, and 12px before actions. Stack toasts with an 8px gap. |
| States | Entered, visible, hovered/focused, dismissing, and persistent. Auto-dismiss low-consequence confirmations after at least 6 seconds; keep errors and interactive toasts until dismissed or resolved. |
| Accessibility | Use a polite live region for success/info and an assertive region sparingly for urgent failure. Pause timeout on hover and focus. Do not move focus to the toast automatically. |
| Responsive | Place desktop toasts at the top-right below persistent chrome and mobile toasts at the bottom above safe areas. Show at most three; consolidate repeated messages. |

## Table

| Aspect | Rule |
| --- | --- |
| Purpose | Support scanning, sorting, comparing, and acting on structured evidence. Use it instead of card grids for multi-column comparisons. |
| Variants | **Standard.** **Compact data.** **Selectable.** **Expandable rows** only when expansion preserves comparison context. Optional sticky header and sticky identity column follow page needs. |
| Sizes | Use 48px rows, or 52px when a cell includes secondary metadata; headers are at least 40px. Use 16px horizontal cell padding, reduced to 12px in compact layouts. Numeric cells use the sans role with tabular figures. |
| Spacing | Align text left and comparable numeric values right. Keep icons 8px from labels. Use dividers between rows; avoid boxed cells and zebra striping unless testing shows a scanning benefit. |
| States | Row hover, keyboard focus within cells, selected, expanded, sorted, loading, empty, and error. Selected rows use the shared fill, border, marker, and selection control. Skeletons preserve column widths. |
| Accessibility | Use native table semantics, a caption or accessible name, scoped headers, and `aria-sort`. Selection and expansion controls need row-specific names. Announce result-count changes outside the table. |
| Responsive | Preserve the table with column priority and an internal horizontal scroll region. Keep the identity column sticky and show an overflow cue. Hide only nonessential columns; never rely on hover for actions. |

## EmptyState

| Aspect | Rule |
| --- | --- |
| Purpose | Explain why useful content is absent and offer the most relevant next step. |
| Variants | **First use:** helps users create or import. **No results:** reflects filters/search and offers reset. **No data:** explains unavailable evidence. **Recoverable error:** offers retry or support path. |
| Sizes | **Compact:** for a table or panel, 24px vertical padding. **Default:** for a primary surface, 48px vertical padding with content capped near 480px. Optional illustration or icon is 40–64px and informational. |
| Spacing | Use 12px icon-to-title, 8px title-to-body, and 20px body-to-action. Keep secondary actions 8px from the primary action. |
| States | Static, loading-to-empty, filtered, error, and retrying. Do not show an empty state before initial loading resolves. |
| Accessibility | Use a real heading when it represents the main region and concise explanatory text. Keep actions keyboard reachable; announce a newly resolved loading or filtering result when appropriate. |
| Responsive | Center compact content but left-align longer copy. Stack actions and make the main action full width on narrow screens when useful. Do not let decoration consume most of the viewport. |

## Components to expand later

- Modal
- Drawer
- DropdownMenu
- Tooltip
- Tabs
- Pagination
- Breadcrumbs
- Avatar
- Sidebar Nav
- Topbar
- Search
- FilterBar
- Skeleton
- Spinner
