# Task 1.3 — fresh-eyes corrections, 2026-11-09

Opened all twelve checker pictures in `/tmp/autorun-fresh-uRCXS1` at original resolution. The previous
inspection wrongly accepted model-name fragments as ordinary scrolling. The browser check now requires
visible model identity and both timing values on the initial phone screen. It failed on the long Analytical
Quality Elo card before the final spacing correction, then passed.

## Every flagged picture

| Checker picture | Disposition |
|---|---|
| 01 Terminal desktop baseline | Fixed fractions under a percentage label and inconsistent precision: 67.17%, 59.60%, etc. Captured scores and raw numeric sorting remain unchanged. |
| 02 Terminal phone baseline | Fixed the percentage display and notes hiding results. Detailed notes follow rankings; a named model and both timings now fit on the first screen. |
| 03 Analytical desktop baseline | Fixed cost visibility, missing scroll hint, isolated CI slash, ragged component links and redundant “elo”. Primary columns fit together; CI stays on one line; related links have equal widths. |
| 04 Analytical phone baseline | Fixed unequal component widths and shifted contents with one grid column and a fixed indicator slot. |
| 05 Finance desktop baseline | Removed the false “integer score” annotation; retained the captured decimal values. |
| 06 Finance phone baseline | Same label correction in the shared header. |
| 07 Terminal desktop timings | Fixed lost model identity, dangling metadata separator and unexplained AA. Primary columns fit together, Model stays pinned, and the intro spells out Artificial Analysis (AA). Blue timings are working source links. |
| 08 Terminal phone timings | Fixed unidentified rows and sliced cost glyphs using named cards with rank, provider, score, timings and cost. Blue timings remain working source links. |
| 09 Analytical desktop timings | Fixed the unnamed missing-value row, CI wrapping, component layout and metadata separator. Muse Wonder Full (Max) is visibly associated with its dashes. |
| 10 Analytical phone timings | Fixed unidentified rows and clipped cost fragments. Whole names and ranks appear above their values in cards. |
| 11 Finance desktop timings | Fixed model fragments, excessive header wrapping/floating alignment and integer annotation. Fallback title is two lines; headers align at the top. Different timing-source wording is intentional. |
| 12 Finance phone timings | Fixed unidentified rows, cost fragments and floating table headers. Named cards contain separately labelled, whole values. |

DECISION: not fixed blue timing values (07/08), because they link to the model's Artificial Analysis profile, matching the cost links.
DECISION: not fixed different timing names (11), because the plan distinguishes evaluation-specific time from the page-wide Intelligence Index fallback; identical labels would conceal that difference.

## Current pictures opened at original size

| File | Observation from the picture |
|---|---|
| `terminal-bench-4-0-1440-timings.png` | Complete models sit beside percentages and both timings inside the white card. Timing headers and dates are whole; further metadata scrolls right and rows continue below. |
| `terminal-bench-4-0-390-timings.png` | #1 Kimi K3.1 Pro sits above 67.17%, both timings, cost and release date. Navigation is above the card; no stray clipped digits or covered text. |
| `aa-briefcase-analytical-quality-elo-1440-timings.png` | Complete model labels identify every visible timing row, including Muse Wonder Full (Max) with dashes. Further metadata scrolls right and rows continue below. |
| `aa-briefcase-analytical-quality-elo-390-timings.png` | The long model name wraps whole above its score and both timing tiles. Cost and release details continue below the frame; the timing values remain whole. |
| `finance-accounting-1440-timings.png` | Whole models and decimal scores accompany the complete two-line fallback timing title. Headers align at their tops; further metadata scrolls right and rows continue below. |
| `finance-accounting-390-timings.png` | The named model sits above its score and labelled timing tiles. The fallback label wraps inside its tile; the bottom card edge continues below the frame, with both timings whole. |
| `aa-briefcase-analytical-quality-elo-1440-components.png` | Three equal-width links share their top and bottom edges beneath the explanation. Selected styling does not shift text; nothing is clipped or covered. |
| `aa-briefcase-analytical-quality-elo-390-components.png` | Three equal-width links stack beneath the explanation. Text starts align, including the selected middle link; titles and subtitles are whole. |

Also opened the updated timing/header crops, copied-header crops, complete phone-card crops, and the exact
row-two CI crop (`-20.47 / +20.47`) at 100%. Historical `*-before.png` files remain as baselines. Removed
obsolete phone sticky-header crops because phone results now use cards.

## Verification

- All 12 related unit tests passed, including percentage conversion, fixed precision, source preservation and timing fallbacks.
- TypeScript and the production build passed using bundled data and a demo Firebase project.
- Complete-cohort browser sorts passed on all three evaluations in both directions, with dashes last. Phone sort controls and values also passed.
- Layout/capture checks passed again after the final header-only adjustment: first-screen phone timings, pinned desktop model, readable labels, no page overflow, CI wrapping and aligned component links. Browsers and preview were stopped.

Task 1.4 and the phase-wide review remain separate tasks.
