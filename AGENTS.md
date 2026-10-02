# Repository agent instructions

## Commit and push after every change

After making each change in this repository:

1. Inspect the working tree and review the diff. Keep unrelated user changes out of the commit.
2. Create a commit immediately with a concise message that states what changed, such as `docs: add leaderboard product plan`.
3. Push the commit to the current branch's configured upstream.
4. If the workspace is not a Git repository, the branch has no upstream, the remote is missing, or authentication is unavailable, report the exact blocker instead of guessing a remote or forcing a push.
5. Never force-push, rewrite history, or include unrelated changes to satisfy this rule.

Commit messages should describe the actual change in the files being committed. If a push fails after a successful commit, keep the commit and report the push failure and its cause.

## UI/Visual Consistency Rule

Before implementing any change that affects the UI:

1. Inspect the current design of the affected screen/component first.
   Review the existing layout, spacing, typography, colors, borders, radius, shadows, icons, alignment, states, and overall visual style.

2. Make sure the change matches the current design.
   Do not introduce new visual styles, patterns, components, or layouts unless explicitly requested or clearly necessary.

3. Check for possible visual issues before implementing.
   Look for anything that could cause misalignment, inconsistent spacing, broken layout, poor contrast, overflow, mismatched sizing, or a design that feels out of place.

4. If the change may visually break or weaken the UI, stop and propose a better alternative.
   Prefer the option that stays closest to the existing design and keeps the interface clean and consistent.

5. After implementing, verify the result visually.
   Make sure the UI still looks consistent, polished, and aligned with the rest of the app.
