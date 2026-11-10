# Task 1.3 browser evidence — 2026-11-10

Updated after the fresh-eyes review of copies in `/tmp/autorun-fresh-eFKf0B`.
All 12 supplied pictures were opened at native resolution before deciding on the
37 reported items below. All 13 final captures were retaken and reopened, including
Terminal-Bench on phone and both native-pixel crops. This run used bundled data with
`DATA_SOURCE=local`; no production data, settings, scores or source ranks changed.

## Reproduce

```sh
DATA_SOURCE=local npm run build -- --webpack
DATA_SOURCE=local npm start -- --hostname 127.0.0.1 --port 3180
PLAYWRIGHT_MODULE=/home/ubuntu/projects-steps-documentation/node_modules/playwright/index.mjs \
BASE_URL=http://127.0.0.1:3180 \
NEW_MODELS_SCREENSHOT_DIR=docs/screenshots/new-models-nov \
node scripts/check-master-browser.mjs
```

Run the server in the background, retain `$!`, and stop that PID after checking.
This run used an EXIT trap on each server; the final PID and port were checked after exit.

## Checks

- Production webpack build, including TypeScript: passed after moving the stateful scroll cue into its own client component.
- Related unit tests (`evaluation-display`, `evaluation-speed`, `model-speed`): 14 passed. The score-precision regression failed before the formatter fix.
- Existing master browser check: passed, including CSV, filtering, speed sorts, favorites, source navigation, keyboard and responsive overflow checks.
- Focused model check: five Fable and two Muse configurations at both widths; names wrap without overlap; frozen Model cells stay fixed; phone aggregates and both evaluation ranks/scores match bundled data.
- New review regressions: legends, single evaluation heading, cost date lines, aggregate alignment and scroll-cue appearance/disappearance passed; layout audit, console and page errors clear; all 13 screenshots inspected at full size.
- JavaScript syntax, whitespace and screenshot-manifest checks passed; local server stopped by its recorded PID and port 3180 closed.

The initial follow-up rebuild failed with `Build failed because of webpack errors`
after browser state was added to the shared server primitives. Moving the cue into
`table-scroll-frame.tsx` restored the server/client boundary; the final build passed.
The first sandboxed unit invocation only reported `test failed`; the unrestricted
pre-fix run showed the expected four-decimal assertion failure. The original task's
Turbopack stall and one-off metadata command failures are recorded in commit `7efd4c5`.

`browser-check.json` records names, ranks, displayed scores and the screenshot manifest.
Only display precision changes: for example `34.115` now appears as `34.1150`.

| Configuration | Intelligence Index rank | Terminal-Bench 4.0 rank |
| --- | ---: | ---: |
| Fable 5.2 Max | 1 | 7 |
| Fable 5.2 Xhigh | 2 | 5 |
| Fable 5.2 High | 3 | 7 |
| Fable 5.2 Medium | 9 | 19 |
| Fable 5.2 Low | 15 | 21 |
| Muse Ember Max | 43 | 42 |
| Muse Ember Xhigh | 50 | 48 |

## Every checker item

Numbers match the supplied checker picture prefixes; letter order follows its findings.

| Item | Decision and result |
| --- | --- |
| 01a | Fixed: removed the redundant metric eyebrow, retaining breadcrumb and title. |
| 01b | Fixed missing continuation cue: right-edge fade and chevron show hidden columns. The rightmost column can still be partially visible; see decision below. |
| 01c | Fixed: Intelligence Index values use four decimal places with tabular figures. |
| 01d | Fixed: visible legend explains the dash above the table. |
| 02a | Fixed by the same evaluation heading change on phone. |
| 02b | Fixed capture: complete panel, bottom margin and Sources and timing notes summary included. |
| 02c | Retained the compact cost label; the new visible legend defines its full meaning. Release date is an existing desktop column beyond the scroll edge, not a missing field. |
| 02d | Fixed by the visible dash legend on phone. |
| 03a | Intentional horizontal viewport boundary; added fade/chevron so the partial header indicates more columns rather than an empty result. |
| 03b | Fixed capture: align the Terminal-Bench column beside the frozen divider with its full cell padding visible. |
| 03c | Fixed: master label now reads Terminal-Bench 4.0. |
| 03d | Fixed: sentence-case cost header; currency/source and complete capture date occupy separate lines. |
| 03e | Fixed: shorter comma-search hint stays on one line; favorites count uses regular weight, distinct from actions. |
| 03f | Retained full-name wrapping and existing frozen widths; names remain separate from stars and contained in their cells. |
| 04a | Fixed: aggregate value aligns with other row numbers; dimension count sits below as secondary text. |
| 04b | Fixed by the same cost header/date and search-hint changes. |
| 04c | Fixed: visible legend says Aggregate uses 9 of 20 evaluations; disclosure says All 20 evaluation ranks. |
| 05a | Fixed: centered CSS chevron replaces the low-baseline text glyph. |
| 05b | Fixed capture: 16px gap above the anchored master panel. It is a home-page section and does not need a new breadcrumb. |
| 06a | Fixed capture: header and top gap included in the full 390px master shot. |
| 06b | Fixed by the visible aggregate explanation and explicit evaluation-rank disclosure. |
| 06c | Retained existing independent page-size defaults; both controls work and all filtered models fit on one page. |
| 07a | Fixed capture: 8px margin around the complete card border and rounded corners. |
| 07b | Retained equal-height metric tiles, which align the two-column grid; unused space is not missing content. |
| 08 | No fault was described; the full-size crop shows an intact cell, separate star and complete text. |
| 09a | Fixed capture: ends after the master panel with margin, excluding unrelated partially visible benchmark cards. |
| 09b | Retained existing benchmark category labels; repetition is a stylistic preference and does not obscure content. |
| 09c | Fixed: dash legend visible before the table. |
| 09d | Fixed: complete cost capture date stays together. |
| 10a | Fixed: dash legend visible above phone cards. |
| 10b | Fixed by the CSS disclosure chevron change. |
| 11a | Fixed capture: full phone header and gap included. |
| 11b | Fixed: dash legend, explanation of 9 versus 20, and explicit evaluation-rank disclosure. |
| 12a | Fixed missing continuation cue with the fade/chevron; Provider remains part of the horizontally scrolling table. |
| 12b | Fixed: removed the stray Score (%) eyebrow; percentage units remain in scores and column heading. |
| 12c | Fixed: visible dash legend above the table. |
| 12d | Fixed: visible text explicitly says cost is per Intelligence Index task and directs readers to the time label for its task. |

## Remaining decisions

- DECISION: not fixed partial right-edge columns (01b, 03a, 12a), because these are horizontal viewports; the new fade/chevron explicitly signals hidden content and disappears at the end.
- DECISION: not fixed the compact phone cost wording and Release date placement (02c), because the legend defines the same cost and Release date already exists farther right in the desktop table.
- DECISION: not fixed four-line Model names and Provider whitespace (03f), because full names must wrap inside the established frozen column without overlapping stars or scores.
- DECISION: not fixed page-size defaults of 25 and 50 (06c), because the master and evaluation tables have independent existing pagination settings and both show the entire filtered cohort.
- DECISION: not fixed the extra space in the Cost tile (07b), because equal-height tiles preserve row alignment while Aggregate includes a dimension count.
- DECISION: not fixed the name crop (08), because the checker supplied no fault and the complete text and star are separate at full size.
- DECISION: not fixed repeated benchmark category labels (09b), because these existing labels identify each standalone tile; this task's captures now exclude that unrelated area.

## Final look check

All widths remain 1440px or 390px. Real phone first-screen shots are 390×844.
Tall phone captures keep normal typography and include the header; evaluation captures
also include the notes summary and bottom margin. Crops retain native pixels.

- LOOKED: master-fable-1440.png · Five ruled rows sit above pagination; stars are separate from four-line names, dates are whole and row numbers align; the right-edge cue overlays only the scrolling boundary.
- LOOKED: master-fable-1440-frozen.png · Five names remain in front of scrolling ranks; Terminal-Bench 4.0 has clear divider padding; the far-right partial column fades into the continuation cue, without covering names or scores.
- LOOKED: master-fable-name-crop.png · The cell contains the complete four-line name with the star to its left; text ends before the cell base and no text is covered.
- LOOKED: master-muse-1440.png · Two rows sit above pagination and a complete panel base; names, scores and dates are whole, dashes have a legend, and unrelated benchmark links are outside the capture.
- LOOKED: master-fable-390-first-screen.png · The header sits above a 16px gap, controls and first card; the card continues below the frame, but the complete name, aggregate and cost are readable; no overlay covers them.
- LOOKED: master-fable-390.png · Header and gap stand above five bordered cards and pagination; titles, stars, metrics and bases remain separate, with all names and scores whole.
- LOOKED: master-fable-last-card-crop.png · The complete Low-effort card stands inside an 8px capture margin; star and title are separate, tiles sit inside the border, and no text or corner is clipped.
- LOOKED: master-muse-390-first-screen.png · Header, gap and controls sit above the Max card; lower tiles continue below the viewport, while the full name, aggregate, cost and dash legend remain visible.
- LOOKED: master-muse-390.png · Header and gap stand above two complete cards and pagination; tiles stay inside borders and no name, score or card base is cut or covered.
- LOOKED: intelligence-index-1440.png · Breadcrumb and single title stand above seven ruled rows; four-decimal scores and ranks align, names stay whole, and only the scrolling right edge carries the fade/chevron.
- LOOKED: intelligence-index-390.png · Header and title stand above seven complete cards; names, ranks and four-decimal scores are readable, with the notes summary and margin below the final panel base.
- LOOKED: terminal-bench-4-0-1440.png · Single title stands above seven rows; wrapped names, percentages and tied ranks remain whole, the cost/dash legend is visible, and the cue marks the right scroll edge.
- LOOKED: terminal-bench-4-0-390.png · Header and title stand above seven bordered cards; ranks and percentages are whole, metric tiles stay inside their bases, and the notes summary and bottom margin are included.

Shared UI code changed; the full check remains part of phase review R1, not this light-check task.

## Phase 1 review (R1, 2026-11-10)

Reshot after the review fixes; full-size crops are in `review/`.

- LOOKED: review/terminal-bench-4-0-1440-right-edge.png · rows sit on their rules; "Anthropic" fades out under the cue and the chevron now sits on solid surface, not on text (before: on "Anthropic").
- LOOKED: review/master-haiku-1440.png · five Haiku 5.5 rows now show Time per Task and First Answer (15.8/183.8 … 2.1/6.9; before: dashes); the last rank digit fades slightly under the cue but stays readable.
- LOOKED: review/intelligence-index-1440-header.png · "Original source ↗" link replaces "Source: supplied workbook".
- LOOKED: review/aa-briefcase-analytical-quality-elo-390-first-screen.png · one-line legend; the first card's two timing tiles end above the bottom edge (before: cut at 844 px).
- LOOKED: review/terminal-bench-4-0-390-top.png · "Cost / Intelligence Index task" wraps inside its tile; the release-date tile in the same row grows with it.
