# Task 1.3 browser evidence — 2026-11-16

Checked the production webpack build against bundled data (`DATA_SOURCE=local`).
The master browser check called the new-models pass and passed: Hydrogen ×4,
Argon ×2 and Qwen4 ×1 at 1440px and 390px. All 20 evaluation pages passed at both
widths: 96 audited rows for the six new configurations plus 19 Argon High rows,
230 row checks in total. Each row's name, source rank, displayed score, cost,
Time per Task and First Answer agrees with the merged bundled data. All six
audit columns are also checked against `docs/GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md`,
including the 24 cells absent from AA. The three Briefcase component merges
match `src/lib/data.ts`.

`browser-check.json` contains the names, ranks, scores, displayed metrics, spaced
search result and manifest of 29 PNGs. Desktop captures are 1440px wide; phone
captures are 390px wide, with separate 390×844 first-screen frames and taller
captures that show all cards without shrinking them. The Hydrogen frozen-column
frame, name crop and first/last card crops show complete names, separated stars
and intact borders. Direct search URLs and evaluation links supply these views.
The two About captures show **16 Nov 2026** in the introduction.
The shared-view review also captures Terminal-Bench 4.0, Analytical Quality Elo
and SciCode at both widths, including phone first screens. Native detail crops
show the scroll caption clear of table rows and the bordered descending control.

Searching **Qwen4** finds Qwen4 Max. Searching **Qwen 4** (with a space) returns
zero models and does **not** find Qwen4 Max. Search behavior is unchanged, as the
plan requires. The look check found the existing single-result wording
“1 models”; it now reads “1 model” on both layouts, covered by the browser pass.
All 12 fresh-eyes copies and all 29 final captures were opened at native
resolution. Seven retaken frames are byte-identical to the earlier evidence;
the shared changes affect desktop table captions, master header dates and
evaluation sort/status presentation. The decisions below record intentional
layouts and the separate score-unit follow-up.
Horizontal table continuation and content below the phone first-screen boundary
are scrolling content; the full phone captures include the last card and panel
bottom. No art assets were added.

| Configuration | Intelligence Index rank | Terminal-Bench 4.0 rank |
| --- | ---: | ---: |
| Gemini 4 Hydrogen (Xhigh) | 16 | 26 |
| Gemini 4 Hydrogen (High) | 21 | 23 |
| Gemini 4 Hydrogen (Medium) | 42 | 70 |
| Gemini 4 Hydrogen (Low) | 77 | 131 |
| Gemini 4 Argon (High) | 22 | 13 |
| Gemini 4 Argon (Medium) | 29 | 19 |
| Qwen4 Max | 39 | 34 |

Reproduce with the existing installed Playwright module (or replace its path):

```sh
DATA_SOURCE=local node node_modules/next/dist/bin/next build --webpack
DATA_SOURCE=local node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3180 > /tmp/ai-models-browser-server.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid"; wait "$server_pid" 2>/dev/null || true' EXIT
until curl --fail --silent --output /dev/null http://127.0.0.1:3180/about/data; do
  kill -0 "$server_pid" || exit 1
  sleep 1
done
PLAYWRIGHT_MODULE=/home/ubuntu/projects-steps-documentation/node_modules/playwright/index.mjs \
BASE_URL=http://127.0.0.1:3180 \
NEW_MODELS_SCREENSHOT_DIR=docs/screenshots/new-models-hydrogen \
node --import tsx scripts/check-master-browser.mjs
```

The successful runner stopped its retained node server PID on exit and verified
that port 3180 was free. Its EXIT trap also ran after each failed browser probe.
No production data, settings or services were changed.

Validation: production webpack build; 22 related display/speed/fixture unit tests;
TypeScript; the complete master browser check with the new-models pass; scripted
layout/console checks plus native screenshot review; syntax/whitespace and PNG
manifest checks. No lint command or linter configuration exists in this repo.

Earlier attempts: Turbopack stayed at “Creating an optimized production build”
and was stopped. Sandboxed webpack reported `Build failed because of webpack
errors`; sandboxed `model-speed.test.ts` only reported `test failed`. Both
passed outside the sandbox. The first browser run failed because the checker
used capture-row order for the two Briefcase Elo tables; the app correctly uses
source-rank order. The new fixture regression failed before that checker fix.
A focused browser assertion also failed on “1 models” before the copy fix.
The final browser run includes assertions for singular/plural counts at both
widths. An initial audit-row parser also matched six cost-table rows (26 vs 20);
requiring the metric column limits it to the coverage table.

## Fresh-eyes review of `/tmp/autorun-fresh-tD5TeI`

The four new browser regressions failed against the previous production build
before the fixes: date format, caption placement, phone direction-control style,
and scoring-status context. They now pass in `check-master-browser.mjs`, along
with all 230 model/evaluation/viewport checks and the existing master checks.
The review server's retained PID, 1224741, was stopped and port 3180 was free.

| Checker item | Decision and verification |
| --- | --- |
| 01 About desktop; 02 About phone | No specific fault was supplied. Both show the complete 16 Nov 2026 capture date; the phone article continues below its first viewport. Retaken and reopened; retained. |
| 03 desktop right edge | Removed the overlay fade that washed out Provider/Alibaba; those words are now readable. The table still scrolls to its remaining metadata columns, with the Model column frozen. This continuation is intentional. |
| 03, 06, 09, 10 tiny row-edge chevron | Replaced with a bold “More columns →” caption on its own line above the table. It cannot cover headers or rows, disappears at the right end, and returns on scrolling back. The slot keeps its height when the caption disappears. |
| 04 phone direction control | Uses the master's existing secondary/default button and “Asc ↑” / “Desc ↓” wording. Ascending and descending source-rank order passed on Intelligence Index and all three additional screens. |
| 05 isolated “Independently scored” note | Added “AA scoring status:” to the card note and explained in the visible legend that status appears only when AA supplies it. Desktop's Scoring status column and the phone note are checked against the same captured values; other models receive no invented status. |
| 06, 09, 10 mixed dates | Every master evaluation header and its tooltip now uses the same human date format as cost/timing headers: “16 Nov 2026”. All 20 rank-header dates are checked. Stored dates and CSV values are unchanged. |
| 07, 08, 11, 12 favorite-star indent | The 44×44 button's left edge aligns with the metric tiles; its star glyph is centered in that touch area. Kept the existing layout and added geometry assertions for every filtered phone card. |

The three intentional layouts are recorded in `docs/approved-looks.md` for the
next checker. The scroll-caption and reverse-sort detail crops were inspected
at native size as well as the complete panels.

For R1: the additional SciCode captures expose a pre-existing unit-label issue:
the “Score (%)” label accompanies stored fractional displays such as `0.618056`.
This review changes layout and wording only; it leaves the existing score
formatter and captured values unchanged. That score-unit issue is not an
approved look and remains a phase-review follow-up.
