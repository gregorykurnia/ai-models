# Readable copy of the personality profiles (brief for Codex)

**Pick:** GPT-6.2 Sol xHigh, one task. It is a build task with a pass/fail check, and it touches no saved data or scores.

## Why
ChatGPT can't read https://claude.ai/artifact/5XNehhaSU7LnZ18MCfZatJ. That URL serves a `noindex` shell titled
"Claude Artifact" and loads the page inside a JavaScript iframe on `*.frame.claudeusercontent.com`. Even inside the
iframe, `index.html` has an empty `<main id="app">`, and JavaScript draws everything. A web fetch therefore sees no
profiles and no scores. Changing `index.html` can't fix the claude.ai link, so the fix is a plain Markdown copy in this
repo, which is public on GitHub.

## Build
1. Add `for-fun/personality-profiles/export-md.mjs` (Node, no new dependencies). It reads `index.html`, pulls out the
   `DATA` and `PROFILES` JSON and the pure helper block in `template.html` (from `const esc` up to `function render()`:
   `rankOf`, `rankText`, `refFor`, `personalityTypes`, `similarModels`, `ENN`), runs that block in `node:vm`, and writes
   `profiles.md`. Reusing the page's own code keeps one home for the MBTI, Enneagram and closest-model math. Don't
   rewrite it in Python.
2. At the end of `build.py`, run `node export-md.mjs`, so `python3 build.py` still builds everything. Update the
   docstring to say `profiles.md` is generated and must be committed with `index.html`.
3. Write `profiles.md` as plain Markdown, using headings, lists and pipe tables only (no HTML, no emoji):
   - Header: what it is, AA-PersonalityBench source URL, capture date, model count, how to read a percentile (higher
     means more of the trait; mark lower-is-better traits and the Slop index), and the interactive page's URL.
   - One section per profile, in `profiles.json` order:
     - name, variant, maker, archetype name and line, tagline;
     - the computed MBTI and Enneagram types;
     - summary, typesNote, strengths, gaps, versus and tips;
     - best for and worst for, with each ref written out as `Label: 87th pct (#7 of 53)`;
     - a table of every index and all 30 traits, with columns for percentile, rank, the previous model's value and the
       change (skip the last two when there is no `previous`);
     - closest 3 and opposite 3 models, each with its match %.
   - "All models": every bench model's index percentiles in one table, then one trait table per index (the trait
     percentiles of every model).

## Won't change
`template.html`, `index.html` output, `profiles.json`, `data/`, the published artifact.

## Done when
- `python3 build.py` writes both files. Running it twice leaves `git diff` empty, so the output is deterministic.
- `profiles.md` has all 7 profile names and archetypes, all 53 bench model names, and Fable 5.2's Literate row shows
  `#3 of 53`.
- Spot check: Fable 5.2's MBTI, Enneagram and closest models in `profiles.md` match the live page.
- Commit `export-md.mjs`, `build.py`, `profiles.md` and this file, then push to the current branch. Report this raw URL,
  for pasting into ChatGPT:
  `https://raw.githubusercontent.com/gregorykurnia/ai-models/neon-omniscience-business/for-fun/personality-profiles/profiles.md`
  Then run `curl -s` on it and grep for `The Candid Confidant`.
