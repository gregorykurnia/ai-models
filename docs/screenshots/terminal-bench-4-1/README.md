# Task 1.6 browser evidence

These captures show a local production build of `c3b8216` using the bundled data. The 4.0 URL returned HTTP 308 and landed on the 4.1 page used for the 390px capture. The homepage evaluation catalog and `/llms.txt` listed 4.1. The data notes counted 20 evaluations.

- Terminal-Bench shows Kimi K3.1 Pro first at 68.18%. The Time per task column shows dashes, and the cost column shows the bundled Intelligence Index task cost. At 390px, the title fits on a single line. Astra's filtered card shows 66.16% after reloading its direct link.
- The master shows the 4.1 header between Presentation Elo and FrontierCode 2.0. A second view shows Kimi's 31.3 average rank and the ascending Aggregate Score sort.
- The Index shows Claude Fable 5.2 (Adaptive Reasoning, Max Effort, Default Fallback) first at 64.5636 at both widths. The bundle and data notes still use v5.0.1 with 156 models from 19 Nov 2026.

Task 1.6 remains open. Task 1.3's full capture returned HTTP 404, leaving the 4.1 timings and task costs and the v5.0.2 Index pending. Task 1.4's workflow refresh depends on that capture.

- `check-evaluation-browser.mjs` stopped at `terminal-bench-4-1 time_per_task: expected timings`.
- `check-master-browser.mjs` stopped at `Time per task: evaluation has speed values`.
- `check-workflows-browser.mjs` reached the malformed URL assertion and received HTTP 500 with `Internal: NoFallbackError` in the Next.js server log.
- The SWE-Atlas-QnA evaluation, master, suitability and data-notes checks passed when exercised independently of the earlier failures.
