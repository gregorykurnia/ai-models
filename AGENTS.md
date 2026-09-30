# Repository agent instructions

## Commit and push after every change

After making each change in this repository:

1. Inspect the working tree and review the diff. Keep unrelated user changes out of the commit.
2. Create a commit immediately with a concise message that states what changed, such as `docs: add leaderboard product plan`.
3. Push the commit to the current branch's configured upstream.
4. If the workspace is not a Git repository, the branch has no upstream, the remote is missing, or authentication is unavailable, report the exact blocker instead of guessing a remote or forcing a push.
5. Never force-push, rewrite history, or include unrelated changes to satisfy this rule.

Commit messages should describe the actual change in the files being committed. If a push fails after a successful commit, keep the commit and report the push failure and its cause.
