# Task 1.3 browser evidence — 2026-11-10

Local production build with `DATA_SOURCE=local`; no production data or settings changed.
Turbopack remained at “Creating an optimized production build” without a result and was stopped.
The webpack fallback passed, including TypeScript.

Run the existing browser check with the optional focused pass:

```sh
DATA_SOURCE=local npm run build -- --webpack
DATA_SOURCE=local npm start -- --hostname 127.0.0.1 --port 3180
PLAYWRIGHT_MODULE=/home/ubuntu/projects-steps-documentation/node_modules/playwright/index.mjs \
BASE_URL=http://127.0.0.1:3180 \
NEW_MODELS_SCREENSHOT_DIR=docs/screenshots/new-models-nov \
node scripts/check-master-browser.mjs
```

Start the server in the background, retain `$!`, and stop that PID after checking.
This run did so with an EXIT trap on every browser pass. The focused pass was rerun
after fixing capture framing; no app changes or second build were needed.

## Checks

- Production webpack build and its TypeScript check: passed.
- Existing master browser check: passed (637 models, CSV/filter/source links, speed sorts, favorites, drawer, keyboard and responsive overflow checks).
- New-model master searches: exactly five Fable and two Muse configurations at 1440px and 390px; names match bundled entries, phone aggregate scores match desktop, long names wrap, and the Model column remains fixed after scrolling 900px.
- Intelligence Index and Terminal-Bench 4.0: all seven names, source ranks and displayed scores match bundled entries on desktop and phone, including tied ranks.
- Layout audit and full-size visual inspection: passed; no phone overflow, overflowing text, covered visible buttons, page errors or console errors. Thirteen PNGs, including two crops, reviewed.
- JavaScript syntax and diff whitespace checks: passed; local production servers stopped by their recorded PIDs.

`browser-check.json` records the names, ranks, scores and screenshot manifest.

| Configuration | Intelligence Index rank | Terminal-Bench 4.0 rank |
| --- | ---: | ---: |
| Fable 5.2 Max | 1 | 7 |
| Fable 5.2 Xhigh | 2 | 5 |
| Fable 5.2 High | 3 | 7 |
| Fable 5.2 Medium | 9 | 19 |
| Fable 5.2 Low | 15 | 21 |
| Muse Ember Max | 43 | 42 |
| Muse Ember Xhigh | 50 | 48 |

## Look check

Desktop master captures are 1440×1000; evaluation captures are 1440×1200 so the
breadcrumb, heading, all seven rows and pagination fit. Phone first-screen captures
are 390×844. Tall phone captures retain the 390px width and normal text size, showing
all matching cards without rearranging the UI. Crops retain native pixels.

The first capture pass included unrelated home sections in tall master shots and
cropped desktop evaluation breadcrumbs. Those framing faults were corrected. No UI
fault requiring an app change was found. Horizontal table continuation and content
below the phone viewport are intentional; complete names and scores are visible in
the companion full captures. Muse speed dashes reflect missing AA values.

A preliminary PNG dimension helper failed with `ModuleNotFoundError: No module named 'PIL'`;
dimensions were then read successfully from PNG headers with Python's standard library.
A one-off manifest summary command had `SyntaxError: Unexpected token ')'`; the corrected
standard-library check passed for all 13 files, four master counts and four evaluation cohorts.

- LOOKED: master-fable-1440.png · Five rows sit between table rules; stars stand left of wrapped names, with no overlap; later columns continue off the right edge and pagination is below the frame; every name and score is readable.
- LOOKED: master-fable-1440-frozen.png · The same five name cells stay in front of scrolling rank columns; the far-right Intelligence header is clipped by the scroll boundary; no star or name is covered.
- LOOKED: master-fable-name-crop.png · One complete cell fills the crop; the star sits left of the four-line name, with clear space above the cell base; all text is whole.
- LOOKED: master-muse-1440.png · Two rows sit above pagination; stars, names and scores are separate; evaluation tiles continue below the viewport; model text is whole.
- LOOKED: master-fable-390-first-screen.png · The top bar sits above search controls and the first card; the card continues below the bottom edge, but its full name, aggregate and cost are visible; no overlay covers text.
- LOOKED: master-fable-390.png · Five bordered cards stack above pagination inside the master panel; stars sit beside titles and metrics below them; no card edge, name or score is cut or covered.
- LOOKED: master-fable-last-card-crop.png · The Low-effort card encloses its title, metric tiles, rank and disclosure above a complete bottom border; the star is separate and all text is readable.
- LOOKED: master-muse-390-first-screen.png · The top bar sits above controls and the Max card; the card continues below the viewport, with the full name, aggregate and cost visible; nothing overlaps them.
- LOOKED: master-muse-390.png · Two complete cards sit above pagination; metric tiles remain inside their borders, stars do not cover titles, and all names and scores are whole.
- LOOKED: intelligence-index-1440.png · The complete heading stands above seven ruled rows; wrapped names, scores and ranks align inside their columns; no relevant text is cut or covered.
- LOOKED: intelligence-index-390.png · The heading and filters stand above seven cards; ranks 1/2/3/9/15/43/50 precede readable titles, metrics sit below, and complete card bases remain separate.
- LOOKED: terminal-bench-4-0-1440.png · The full heading stands above seven rows; ranks 5/7/7/19/21/42/48 and percentage scores align beside wrapped names; no relevant text is clipped or overlaid.
- LOOKED: terminal-bench-4-0-390.png · Seven cards stack below the heading and filters; each rank sits before its full title and percentage, tiles stay inside their bases, and no name or score is cut or covered.

## Decisions

- DECISION: Use webpack after the stalled Turbopack attempt rather than keep waiting; the plan explicitly permits the fallback.
- DECISION: Add an optional focused helper to the existing browser check rather than change app code; the UI already displays the imported models correctly.
- DECISION: Keep real phone first-screen shots plus tall 390px captures rather than shrink cards; this preserves text size while documenting every result.
