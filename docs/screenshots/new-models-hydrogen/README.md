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
search result and manifest of 21 PNGs. Desktop captures are 1440px wide; phone
captures are 390px wide, with separate 390×844 first-screen frames and taller
captures that show all cards without shrinking them. The Hydrogen frozen-column
frame, name crop and first/last card crops show complete names, separated stars
and intact borders. Direct search URLs and evaluation links supply these views.
The two About captures show **16 Nov 2026** in the introduction.

Searching **Qwen4** finds Qwen4 Max. Searching **Qwen 4** (with a space) returns
zero models and does **not** find Qwen4 Max. Search behavior is unchanged, as the
plan requires. The look check found the existing single-result wording
“1 models”; it now reads “1 model” on both layouts, covered by the browser pass.
No remaining clipping or overlap was found in the native-resolution review.
After the final build, 13 captures were byte-identical to the reviewed frames;
the other eight were reopened at native resolution, including the count fix.
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

Validation: production webpack build; related display/speed/fixture unit tests;
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
