# Ultramarine Ledger: Overlay and Popup System

This light-only specification extends the Ultramarine foundation and shared components. Implement overlays from the canonical tokens; do not carry forward legacy surface, shadow, spacing, or interaction styles.

## Shared implementation rules

- Render overlays in a dedicated portal. Lock page scroll only for modal layers: dialogs, modal drawers, and bottom sheets.
- Only the topmost dismissible layer responds to outside click or Escape. Closing returns focus to its trigger or the nearest logical fallback.
- Use 24px viewport clearance on desktop and 16px on mobile. Anchored surfaces flip, shift, or resize before they overflow the viewport.
- Use 24px internal padding for dialog-scale surfaces, 16px for compact popovers and mobile surfaces, and 4–8px list padding for menus.
- Keep headers and footers fixed within a scrolling overlay when content exceeds its height. Give the body its own scroll region and visible overflow affordance.
- Trap focus only in modal layers. Non-modal popups keep a logical focus path and must not make the rest of the page inert.
- Avoid nested modal layers. Child menus or popovers opened from a modal render inside that modal's overlay root.

## Overlay surface rules for light mode

| Element | Rule |
| --- | --- |
| Surface | Use `--bg-surface`, `--text-primary`, and a 1px `--border-strong` boundary. Do not use transparent, glass, gradient, or dark surfaces. |
| Small floating surface | Use the control or surface radius and `--elevation-floating` for menus, tooltips, and popovers. |
| Modal surface | Use the modal radius and `--elevation-overlay` for dialogs; use the surface radius on desktop drawers and top-only modal radius on bottom sheets. |
| Scrim | Use `--overlay` behind modal layers only. Do not add blur. The scrim covers the full viewport, including persistent navigation. |
| State color | Keep the surface white. Use semantic color for icons, messages, boundaries, and actions rather than tinting the entire modal. |
| Motion | Use the shared 120–180ms transitions. Dialogs fade with slight scale; drawers and sheets translate from their attached edge. Remove translation when reduced motion is requested. |

## Layer order

| Layer | Token | Behavior |
| --- | --- | --- |
| Anchored popup | `--z-dropdown` | Dropdown menus, context menus, and popovers above page chrome. |
| Drawer / sheet | `--z-drawer` | Scrim at the layer base; panel one local step above it. |
| Modal | `--z-modal` | Dialog scrim and surface above drawers. One active modal layer at a time. |
| Toast | `--z-toast` | Application feedback remains visible above modal surfaces without taking focus. |
| Tooltip | `--z-tooltip` | Top visual layer; never contains actions or blocks input. |

Do not invent route-specific z-index values. A popup launched inside a dialog uses a local stacking context above that dialog surface rather than escaping to another global layer.

## Modal size scale

| Size | Width | Maximum height | Use |
| --- | ---: | ---: | --- |
| Small | 400px | `min(640px, calc(100dvh - 48px))` | Confirmation, short message, one decision. |
| Medium | 560px | `calc(100dvh - 48px)` | Default form or focused task. |
| Large | 720px | `calc(100dvh - 48px)` | Longer form, structured review, two-column content. |
| Extra large | 960px | `calc(100dvh - 48px)` | Dense review or comparison that cannot remain in page context. |
| Full workflow | `min(1200px, calc(100vw - 64px))` | `calc(100dvh - 32px)` | Rare desktop workflow; prefer a page when a stable URL or prolonged work is useful. |

- Widths are maximums; surfaces shrink fluidly before reaching viewport clearance.
- On mobile, small confirmations remain inset by 16px. Form and workflow modals become full-screen surfaces when an inset layout would constrain input or the keyboard.

## Drawer size scale

| Size | Desktop width | Use |
| --- | ---: | --- |
| Narrow | 320px | Navigation, simple filters, short metadata. |
| Medium | 400px | Default detail view or edit controls. |
| Wide | 560px | Complex filters, comparison detail, or a longer form. |

- A desktop drawer must not exceed 45% of the viewport; use a page or modal workflow when more room is required.
- Mobile modal drawers become a bottom sheet for short content or a full-height sheet for navigation and forms.

## Modal / dialog

| Aspect | Rule |
| --- | --- |
| When to use | Block the current workflow for a focused decision, short task, or information that must be acknowledged before continuing. |
| When not to use | Do not use for passive guidance, routine success messages, long research workflows, or content that benefits from a URL and page history. |
| Size and placement | Use the modal scale; Medium is the default. Center in the viewport with desktop clearance. |
| Padding and structure | Use 24px padding. Header contains title, optional description, and trailing close button; body holds content; footer is separated by spacing or a top border. |
| Actions | Align actions to the end; secondary first and primary last. Keep one primary action. Stack full-width actions on narrow mobile screens without changing DOM order. |
| Close and Escape | Show a named close button unless the user must make an explicit choice. Outside click and Escape close only when no data or progress would be lost. |
| Background and scroll | Use the modal scrim. Lock page scroll; scroll the body while header and footer remain visible. |
| Focus and accessibility | Use `role="dialog"`, `aria-modal="true"`, an accessible title, and optional description. Move focus to the heading or first useful control, trap it, and restore it on close. |
| Mobile | Use 16px inset for short content; use a full-screen modal for long forms or keyboard-heavy work. Respect safe areas and `100dvh`. |
| Z-index | Use `--z-modal`; keep child popups in the dialog's local overlay root. |

## Confirmation dialog

| Aspect | Rule |
| --- | --- |
| When to use | Confirm a consequential but reversible or non-destructive choice, such as discarding unsaved edits or replacing a saved view. |
| When not to use | Do not confirm routine, easily undone actions. Use a toast with Undo where recovery is simpler. |
| Size and placement | Use Small, centered. Keep the decision text brief and name the affected object. |
| Padding and structure | Use 24px padding with title, one short body message, and footer. Omit complex content, secondary sections, and forms. |
| Actions | Use Cancel followed by the specific confirm action at the end. Avoid generic labels such as Yes and No. |
| Close and Escape | Omit the header close icon when explicit choice is important. Escape maps to Cancel; outside click is disabled by default. |
| Background and scroll | Use the modal scrim. Content should not scroll; if it does, the pattern is too large for confirmation. |
| Focus and accessibility | Use dialog semantics and focus Cancel by default. Announce the title and consequence; do not use `alertdialog` unless the message is genuinely urgent. |
| Mobile | Keep it centered and inset by 16px. Stack actions only when labels do not fit comfortably side by side. |
| Z-index | Use `--z-modal`; it replaces, rather than stacks over, another modal decision. |

## Destructive action dialog

| Aspect | Rule |
| --- | --- |
| When to use | Confirm deletion, revocation, reset, or another action with material and difficult-to-reverse consequences. |
| When not to use | Do not use red confirmation for safe removal from a local view, reversible toggles, or actions covered by Undo. |
| Size and placement | Use Small; Medium only when the consequence needs a short item summary. Center in the viewport. |
| Padding and structure | Use 24px padding. Header pairs an error icon with a specific title; body states impact and recovery; footer contains the decision. Keep the surface white. |
| Actions | Place Cancel before a clearly named destructive button. Typed confirmation is reserved for high-impact or broad-scope deletion. |
| Close and Escape | No header close icon. Outside click is disabled. Escape cancels unless a destructive request is already processing; processing prevents duplicate submission. |
| Background and scroll | Use the modal scrim. Keep the consequence and actions visible without body scrolling whenever possible. |
| Focus and accessibility | Use `alertdialog` only when immediate attention is warranted; otherwise use `dialog`. Focus Cancel, describe the consequence, preserve visible focus, and announce request failure inline. |
| Mobile | Keep inset by 16px and use full-width stacked actions when needed. Do not convert destructive confirmation into a swipe-dismissible sheet. |
| Z-index | Use `--z-modal`; no other decision layer may open above it. |

## Form modal

| Aspect | Rule |
| --- | --- |
| When to use | Create or edit a focused object in one short session without losing page context. |
| When not to use | Do not use for multi-step setup, lengthy research, broad tables, or work requiring deep links or frequent navigation. |
| Size and placement | Use Medium by default, Large for two-column or longer forms, and Extra large only for dense review. Center on desktop. |
| Padding and structure | Use 24px header/body/footer padding and 24px between field groups. Header names the task; body owns fields and error summary; footer remains visible. |
| Actions | Put Cancel before Save/Create at the end. Disable repeat submission, preserve entered values on error, and show progress in the submit button. |
| Close and Escape | Close after successful submit. If dirty, close button, outside click, and Escape invoke the same discard-confirmation path; otherwise they dismiss directly. |
| Background and scroll | Use the modal scrim. Lock the page; scroll only the form body. Keep validation targets visible when focusing errors. |
| Focus and accessibility | Focus the first field only when that is more useful than the title. Trap focus, associate errors, and focus the error summary after failed multi-field submission. |
| Mobile | Become full-screen for keyboard-heavy or multi-field forms. Use a sticky header/footer, 16px padding, safe-area insets, and body scroll that does not hide focused fields. |
| Z-index | Use `--z-modal`; Select and date/list popups stay within its local overlay root. |

## Drawer / sheet

| Aspect | Rule |
| --- | --- |
| When to use | Show navigation, filters, details, or supporting edits while preserving awareness of the current page. |
| When not to use | Do not use for a small anchored choice, urgent confirmation, or a primary workflow that deserves the full page. |
| Size and placement | Use the drawer scale. Attach detail and edit drawers to the trailing edge; navigation drawers attach to the leading edge. Height is `100dvh`. |
| Padding and structure | Use 24px desktop padding. Header contains title and close; body scrolls; optional footer holds persistent actions. Use dividers between fixed and scrolling regions. |
| Actions | Align footer actions to the end; keep the primary action last. Filters may use Reset as a quiet action and Apply as primary. |
| Close and Escape | Close button is required. Outside click and Escape close modal drawers unless edits are dirty; dirty drawers use the same discard path as form modals. |
| Background and scroll | Modal drawers use the scrim and page scroll lock. Only the body scrolls. A persistent desktop side panel is not an overlay and uses no scrim or focus trap. |
| Focus and accessibility | A modal drawer uses dialog semantics, focus trap, accessible title, and focus restoration. Navigation drawers use a named navigation landmark inside the dialog. |
| Mobile | Use a full-height edge sheet for navigation/forms or a bottom sheet for short filters and actions. Reduce padding to 16px and respect safe areas. |
| Z-index | Use `--z-drawer`; a confirmation launched from it replaces the active interaction at `--z-modal`. |

## Dropdown menu

| Aspect | Rule |
| --- | --- |
| When to use | Present a short list of actions from a button, or a compact list of options when Select is unsuitable. |
| When not to use | Do not use for long searchable data, multi-field forms, explanatory content, or primary navigation. |
| Size and placement | Match at least the trigger width; use 180–320px, with 360px maximum. Open 4px from the trigger, align logical edges, and flip or shift near viewport edges. |
| Padding and structure | Use 4px list padding. Optional group labels and separators organize items; no independent header or footer. |
| Actions | Each row is one action, at least 40px high. Place destructive actions after a separator; submenus are limited to one level. |
| Close and Escape | Close after action, selection, outside click, trigger toggle, route change, or Escape. Escape returns focus to the trigger. |
| Background and scroll | No scrim. Use an internal scroll region when the list exceeds `min(320px, calc(100dvh - 32px))`; keep group labels visible only when useful. |
| Focus and accessibility | Use menu semantics for actions and listbox semantics for selection. Support arrow keys, Home/End, typeahead, disabled items, and roving focus. |
| Mobile | Preserve an anchored menu when it fits. For crowded placement or more than about seven items, use a bottom sheet with the same item order and labels. |
| Z-index | Use `--z-dropdown` or the active modal's local overlay root. |

## Context menu

| Aspect | Rule |
| --- | --- |
| When to use | Offer secondary object-specific actions from right-click, a dedicated overflow trigger, or long press. |
| When not to use | Do not hide essential, primary, or keyboard-only actions in a context menu. |
| Size and placement | Use 180–280px. Open at the pointer or object anchor and clamp to 16px viewport clearance; flip away from the nearest edge. |
| Padding and structure | Use the dropdown list structure and 4px padding. Group only related actions; show shortcuts at the trailing edge when supported. |
| Actions | Use specific labels and 40px rows. Place destructive actions last after a separator. |
| Close and Escape | Close after action, outside click, page scroll, selection change, or Escape. Escape restores focus to the invoking object when one exists. |
| Background and scroll | No scrim. Avoid scrolling; if the menu cannot fit, constrain it and scroll the list rather than moving off-screen. |
| Focus and accessibility | Opening from keyboard moves focus to the first enabled item. Support Shift+F10/Menu key, arrows, Home/End, typeahead, and menu semantics. |
| Mobile | Long press may open a labeled bottom sheet; also provide a visible overflow trigger so discovery does not depend on long press. |
| Z-index | Use `--z-dropdown` or the active modal's local overlay root. |

## Popover

| Aspect | Rule |
| --- | --- |
| When to use | Show compact contextual information or controls tied to a visible trigger, such as column settings or a date picker. |
| When not to use | Do not use for blocking decisions, long forms, essential instructions, or content unrelated to the trigger. |
| Size and placement | Use 280–400px, matched to content. Open 8px from the trigger, prefer below, and flip or shift to remain visible. |
| Padding and structure | Use 16px padding. Optional compact header names the content; body holds information or controls; footer is used only when Apply/Cancel is necessary. |
| Actions | Align footer actions to the end with primary last. Prefer immediate selection when it is safe and clear. |
| Close and Escape | Close on trigger toggle, Escape, and outside click when no edits would be lost. Apply/discard controls govern popovers with staged changes. |
| Background and scroll | No scrim. Limit height to 70dvh and scroll the body; keep a necessary header or action footer visible. |
| Focus and accessibility | Interactive popovers receive focus when opened by keyboard but do not trap it. Use dialog semantics for rich interactive content; otherwise use the semantic role of the contained control. |
| Mobile | Use a wider anchored surface only when it fits with 16px clearance; otherwise convert to a bottom sheet. |
| Z-index | Use `--z-dropdown` or the active modal's local overlay root. |

## Tooltip

| Aspect | Rule |
| --- | --- |
| When to use | Provide a short label or supplemental hint for a focused or hovered control, especially an IconButton. |
| When not to use | Do not place essential instructions, errors, rich content, or interactive elements in a tooltip. |
| Size and placement | Cap at 240px. Place 8px from the trigger and prefer the side with most room; keep 8px viewport clearance. |
| Padding and structure | Use 8px vertical and 10px horizontal padding. One short body only; no header, footer, or actions. |
| Actions | None. If interaction is required, use a popover. |
| Close and Escape | Show after a 500ms hover/focus delay; hide after pointer leave or blur with a short grace period. Escape dismisses without moving focus. |
| Background and scroll | No scrim and no internal scroll. Use the light floating surface, border, and shadow rather than an inverted dark bubble. |
| Focus and accessibility | Focus remains on the trigger. Use `role="tooltip"` and `aria-describedby`; the trigger must still have its own accessible name. |
| Mobile | Never rely on hover or long press for essential meaning. Prefer visible labels; allow tap-triggered help only when it does not compete with the control action. |
| Z-index | Use `--z-tooltip`; the tooltip must not intercept pointer input. |

## Toast / notification

| Aspect | Rule |
| --- | --- |
| When to use | Confirm completion or report a brief asynchronous outcome without interrupting work. |
| When not to use | Do not use for validation, blocking failure, required reading, or status that must remain available in page context. |
| Size and placement | Use 320–400px on desktop at the top-right, 24px from viewport edges and below persistent chrome. On mobile use viewport width minus 32px at the bottom above the safe area. |
| Padding and structure | Use 16px padding. Arrange semantic icon, title/body, optional action, and dismiss button; there is no separate footer. |
| Actions | Allow one short action such as Undo or Retry. Keep it visible beside content or on a second row; never add a multi-button decision. |
| Close and Escape | A dismiss button is required for persistent toasts. Escape dismisses the most recent toast only when focus is within the toast region; it must not compete with a modal. |
| Background and scroll | No scrim and no internal scrolling. Stack with 8px gaps and show at most three; consolidate repeated events. |
| Focus and accessibility | Do not move focus automatically. Use polite live announcements for success/info and assertive announcements sparingly for urgent failure. Pause timing on hover and focus. |
| Mobile | Use bottom placement, safe-area padding, and full available width. Move above keyboards and persistent bottom navigation. |
| Z-index | Use `--z-toast`; toasts remain visible above modal layers but do not become modal. |

## Mobile bottom sheet

| Aspect | Rule |
| --- | --- |
| When to use | On mobile, present short actions, filters, pickers, or compact contextual controls that would not fit as an anchored popup. |
| When not to use | Do not use for destructive confirmation, long multi-step forms, desktop layouts, or content that needs permanent page context. |
| Size and placement | Attach to the bottom edge at full viewport width. Size to content up to 90dvh; use full-height sheet behavior beyond that. |
| Padding and structure | Use 16px padding plus bottom safe-area inset. Optional drag handle sits above a header with title and close; body scrolls; persistent actions stay in the footer. |
| Actions | Use full-width actions for decisions or standard list rows for choices. Keep secondary before primary and limit the footer to two actions. |
| Close and Escape | Close button is required when the sheet has a title or staged changes. Scrim tap, downward swipe, and Escape close only when dismissal is safe; dirty state invokes discard handling. |
| Background and scroll | Use the modal scrim and lock page scroll. Only the body scrolls; prevent scroll chaining until the body reaches its top edge. |
| Focus and accessibility | Treat as a modal dialog with title, focus trap, inert background, and focus restoration. The drag handle is not the only close mechanism. |
| Mobile | Use top-only modal radius, `100dvh`, keyboard-aware positioning, and safe-area insets. Avoid multiple snap points unless the content clearly benefits from them. |
| Z-index | Use `--z-drawer`; a destructive or confirmation dialog, if required, moves the decision to `--z-modal`. |

## Dropdown styling rules

- Use `--bg-surface`, `--border-strong`, the control radius, and `--elevation-floating`; never use a shadow without the border.
- Menu items are at least 40px high with 8px vertical and 12px horizontal padding, an 18px icon, and an 8px content gap.
- Resting items use primary text; supporting shortcuts use muted text. Hover uses `--bg-subtle`; selected options use `--selected-bg` plus a checkmark or equivalent cue.
- Disabled items use the disabled treatment and are skipped by keyboard focus. Destructive items use error text only when the action is genuinely destructive.
- Group labels use the caption or UI type role with semibold weight. Use 1px default-border separators and avoid decorative headings.
- Keep labels on one line when possible. Truncate only nonessential metadata; wrap or widen for the action name.

## Toast placement and timing rules

| Type | Default duration | Rule |
| --- | ---: | --- |
| Success | 6 seconds | May dismiss automatically when no action is present. |
| Info | 8 seconds | Persist when the information changes the user's next step. |
| Warning | 10 seconds | Prefer persistent when user action is recommended. |
| Error | Persistent | Remains until dismissed or resolved; include Retry only when it can work in place. |
| Actionable | Persistent | Undo, Retry, or any focusable action prevents automatic dismissal. |

- Pause the timer on hover, focus, document inactivity, or reduced visibility. Resume with at least two seconds remaining.
- New toasts enter nearest the placement edge. Do not reorder visible toasts; remove the oldest nonpersistent toast when the three-item limit is reached.
- Coalesce repeated events into one updated toast and announce the update once. Do not show a toast for a result already clearly confirmed inline.
