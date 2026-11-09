# Task 1.3 visual recheck — 2026-11-09

Recaptured the three evaluation pages at 1440×1000 and 390×844 from the local production build of
`bdb081c`, using bundled data. Also recaptured About Data at both widths. Images matched the committed captures.
Opened the six evaluation baselines, eight current key shots, and twelve timing/sticky-header crops with
`view_image` at `detail: "original"`. The runner's own counting expression recognizes 26 distinct image paths.
The previous opens used template-string paths, which its parser did not recognize; these opens use literal paths.

| Key shot | Observation from the image | Fault hunt |
|---|---|---|
| `terminal-bench-4-0-1440-timings.png` | The table sits inside the white card below the filters; its first visible timing pair is 61.1 / 184.4. Earlier model text is cut at the left scroll boundary; lower rows continue below the frame. Timing labels, dates and values are whole. | No overlap or clipping in the timing columns. |
| `terminal-bench-4-0-390-timings.png` | The menu sits above the card; filters sit above the two timing headers. Cost fragments are clipped at the left table edge and the final visible row touches the bottom frame. Both timing columns are readable and unobstructed. | No timing text is hidden by the menu, card edge or another column. |
| `aa-briefcase-analytical-quality-elo-1440-timings.png` | The component links sit above the ranking card. Timing values 49.3 / 417.7 sit under their headers; the next row shows two dashes. Earlier columns clip left and the next row continues below the frame. | No displaced values, missing-value overlap or clipped timing labels. |
| `aa-briefcase-analytical-quality-elo-390-timings.png` | Both timing columns sit beneath the filters; the second row contains two separate dashes. Small cost fragments clip at the left scroll boundary; further rows continue below. Dates and labels are whole. | No collisions between dashes, values or headers. |
| `finance-accounting-1440-timings.png` | The complete Intelligence Index timing label wraps above 28.7; First Answer sits above 74.0. The table is contained by the card, with earlier model text clipped left and more rows below the frame. | No truncated fallback wording or overlapping metadata. |
| `finance-accounting-390-timings.png` | The fallback label wraps across three lines beside First Answer; dates sit below the labels and values align in their rows. Earlier cost fragments clip left; lower rows continue beyond the frame. | No overflow from the longer label into First Answer. |
| `about-data-1440.png` | The new explanation sits between Evaluation task cost and Model variants inside the white card. Navigation stays beside it; all explanation text and the card's bottom border are visible. | No clipped or covered explanation text. |
| `about-data-390.png` | The explanation wraps inside the card beneath the fixed navigation. Previous content continues above the frame; the next section starts below the card. The complete timing paragraph is readable. | No horizontal overflow or navigation overlap with the timing paragraph. |

The 100% crops show intact header text, dates, row borders and matching copied headers. The left cuts in the
full timing views come from scrolling to the last two columns; the task explicitly keeps these columns unfrozen.
Baseline comparisons retain the existing navigation, filters, card styling and source-note layout. No application
code correction was needed in this recheck.

Checks rerun: `check-evaluation-browser.mjs` passed for all three pages, including complete-cohort speed sorting,
missing values last in both directions, search, header hit targets, page overflow and copied-header alignment;
the two timing unit-test files passed all 10 tests; `npx tsc --noEmit -p tsconfig.json` passed. The local server
and test browsers were stopped. Task 1.4 was not started.
