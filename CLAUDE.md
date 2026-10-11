# Claude Code instructions

Follow [AGENTS.md](AGENTS.md) for all work in this repository.

## Auto commit and push

- After every change you make here, commit and push it without asking first.
- Stage only the files you changed. Leave unrelated working-tree changes unstaged and uncommitted.
- Write a concise commit message that states what changed, such as `fix: align master filters`.
- Push to the current branch's configured upstream. Never force-push or rewrite history.
- If a commit or push fails, report the exact error. Keep the commit.

## Publish data to production

- When a change updates leaderboard data (`data/`, the capture or import scripts), publish it to production without asking. Commit and push first, then run `npm run publish:data`.
- Run the checks first and publish only if they all pass: `node --import tsx scripts/validate-master.ts`, `node --import tsx --test tests/rubric-snapshot.test.ts tests/suitability*.test.ts`, and `npx tsc --noEmit -p tsconfig.json`. If one fails, stop, report the exact output, and don't publish.
- After publishing, read the evaluation documents back from Firestore. Check that each evaluation's snapshot is `published` and its entry count matches `row_count`, and report the result.
- If the publish fails, report the exact error. Don't retry with a different method to get around it, and keep the commit.
- Code-only changes don't publish. This rule covers the `publish:data` script only; it doesn't let the dev server write to production.

## Report what changed

After each change, tell the user:

- Which files changed and what each change does.
- The commit hash and the branch it was pushed to.
- Anything left uncommitted, such as unrelated working-tree changes.
